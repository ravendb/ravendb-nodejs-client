import { IDisposable } from "../Types/Contracts.js";

export interface CachedItemMetadata {
    changeVector: string;
    response: string;
}

const NOT_FOUND_RESPONSE = "404 Response";

// approximate cost of a cache entry beyond its payload (key, change vector, bookkeeping)
const ITEM_OVERHEAD = 20;

export class HttpCache implements IDisposable {

    private _items: Map<string, HttpCacheItem>;
    /** Raised when the Changes API reports a change, so items cached before it might be stale. */
    public generation: number = 0;
    private _totalSize: number;
    private readonly _maxSize: number;

    constructor(maxSize: number = 128 * 1024 * 1024) {
        this._items = new Map();
        this._totalSize = 0;
        this._maxSize = maxSize;
    }

    public dispose(): void {
        this._items.clear();
        this._items = null;
        this._totalSize = 0;
    }

    public clear() {
        this._items.clear();
        this._totalSize = 0;
    }

    public set(url: string, changeVector: string, result: string) {
        const httpCacheItem = new HttpCacheItem();
        httpCacheItem.changeVector = changeVector;
        httpCacheItem.payload = result;
        httpCacheItem.cache = this;
        httpCacheItem.generation = this.generation;

        this._putItem(url, httpCacheItem);
    }

    public get<TResult>(
        url: string,
        itemInfoCallback?: ({ changeVector, response }: CachedItemMetadata) => void): ReleaseCacheItem {
        const item: HttpCacheItem = this._items.get(url);
        if (item) {
            // re-insert to mark as most recently used
            this._items.delete(url);
            this._items.set(url, item);

            if (itemInfoCallback) {
                itemInfoCallback({
                    changeVector: item.changeVector,
                    response: item.payload
                });
            }

            return new ReleaseCacheItem(item);
        }

        if (itemInfoCallback) {
            itemInfoCallback({
                changeVector: null,
                response: null
            });
        }

        return new ReleaseCacheItem(null);
    }

    public setNotFound(url: string, aggressivelyCached: boolean) {
        const httpCacheItem = new HttpCacheItem();
        httpCacheItem.changeVector = NOT_FOUND_RESPONSE;
        httpCacheItem.flags = "NotFound";
        httpCacheItem.aggressivelyCached = aggressivelyCached;
        httpCacheItem.generation = this.generation;
        httpCacheItem.cache = this;

        this._putItem(url, httpCacheItem);
    }

    public get numberOfItems(): number {
        return this._items.size;
    }

    private _putItem(url: string, item: HttpCacheItem): void {
        const existing = this._items.get(url);
        if (existing) {
            this._items.delete(url);
            this._totalSize -= HttpCache._weigh(existing);
        }

        // an item that can never fit within the budget is not cached at all
        // instead of evicting everything else in a futile attempt to make room
        if (HttpCache._weigh(item) > this._maxSize) {
            return;
        }

        this._items.set(url, item);
        this._totalSize += HttpCache._weigh(item);

        // evict least recently used items until back within the size budget
        while (this._totalSize > this._maxSize && this._items.size > 0) {
            const [oldestUrl, oldestItem] = this._items.entries().next().value;
            this._items.delete(oldestUrl);
            this._totalSize -= HttpCache._weigh(oldestItem);
        }
    }

    private static _weigh(item: HttpCacheItem): number {
        return (item.payload ? item.payload.length : 0) + ITEM_OVERHEAD;
    }

}

export class ReleaseCacheItem {
    public item: HttpCacheItem;
    private readonly _cacheGeneration: number;

    constructor(item: HttpCacheItem) {
        this.item = item;
        this._cacheGeneration = item?.cache.generation;
    }

    public notModified(): void {
        if (this.item) {
            this.item.generation = this._cacheGeneration;
            this.item.lastServerUpdate = new Date();
        }
    }

    // returns millis
    public get age(): number {
        if (!this.item) {
            return Number.MAX_VALUE;
        }

        return Date.now() - this.item.lastServerUpdate.valueOf();
    }

    public get mightHaveBeenModified(): boolean {
        return this.item.generation !== this._cacheGeneration;
    }
}

export class HttpCacheItem {
    public changeVector: string;
    public payload: string;
    public lastServerUpdate: Date;
    public flags: ItemFlags;
    /** Set for a 404 received inside an aggressive caching block. */
    public aggressivelyCached: boolean;
    public generation: number;

    public cache: HttpCache;

    public constructor() {
        this.lastServerUpdate = new Date();
    }
}

export type ItemFlags =
    "None"
    | "NotFound";