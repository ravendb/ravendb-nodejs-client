import { IDisposable } from "../../Types/Contracts.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { DatabaseChanges } from "./DatabaseChanges.js";
import { AggressiveCacheChange } from "./AggressiveCacheChange.js";
import { DocumentChange } from "./DocumentChange.js";
import { IndexChange } from "./IndexChange.js";
import { IChangesObservable } from "./IChangesObservable.js";

/**
 * Raises the cache generation of a request executor whenever the Changes API reports a change, so responses
 * cached in TrackChanges mode are asked for again. Uses its own Changes API connection, like C#.
 */
export class EvictItemsFromCacheBasedOnChanges implements IDisposable {
    private readonly _requestExecutor: RequestExecutor;
    private readonly _changes: DatabaseChanges;
    private readonly _connected: Promise<void>;
    private readonly _unsubscribe: (() => void)[] = [];

    private readonly _evict = () => {
        this._requestExecutor.cache.generation++;
    };

    private _connectedOnce = false;

    // a reconnection may have missed notifications; the first connection has nothing cached to evict
    private readonly _evictOnReconnection = () => {
        if (this._connectedOnce) {
            this._evict();
        }
        this._connectedOnce = true;
    };

    private readonly _evictIfRelevant = (change: DocumentChange | IndexChange) => {
        if (AggressiveCacheChange.shouldUpdateAggressiveCache(change)) {
            this._evict();
        }
    };

    public constructor(requestExecutor: RequestExecutor, databaseName: string, onDispose: () => void) {
        this._requestExecutor = requestExecutor;
        this._changes = new DatabaseChanges(requestExecutor, databaseName, onDispose, null);

        this._changes.on("error", this._evict);
        this._changes.on("connectionStatus", this._evictOnReconnection);

        this._connected = this._connect();
    }

    public ensureConnected(): Promise<void> {
        return this._connected;
    }

    private async _connect(): Promise<void> {
        await this._changes.ensureConnectedNow();
        const features = await this._changes.getSupportedFeatures();

        if (features.aggressiveCachingChange) {
            await this._subscribe(this._changes.forAggressiveCaching(), this._evict);
        } else {
            await this._subscribe(this._changes.forAllDocuments(), this._evictIfRelevant);
            await this._subscribe(this._changes.forAllIndexes(), this._evictIfRelevant);
        }
    }

    private async _subscribe<T>(observable: IChangesObservable<T>, handler: (value: T) => void): Promise<void> {
        observable.on("data", handler);
        observable.on("error", this._evict);
        this._unsubscribe.push(() => {
            observable.off("data", handler);
            observable.off("error", this._evict);
        });

        await observable.ensureSubscribedNow();
    }

    public dispose(): void {
        for (const unsubscribe of this._unsubscribe) {
            unsubscribe();
        }

        this._changes.off("error", this._evict);
        this._changes.off("connectionStatus", this._evictOnReconnection);
        this._changes.dispose();
    }
}
