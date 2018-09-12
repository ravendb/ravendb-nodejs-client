import {IDatabaseChanges} from "./IDatabaseChanges";
import {DocumentConventions, ObjectTypeDescriptor, RequestExecutor} from "../..";
import {IChangesObservable} from "./IChangesObservable";
import {IndexChange} from "./IndexChange";
import {DocumentChange} from "./DocumentChange";
import {OperationStatusChange} from "./OperationStatusChange";
import {DatabaseConnectionState} from "./DatabaseConnectionState";
import {ChangesObservable} from "./ChangesObservable";
import {throwError} from "../../Exceptions";
import * as semaphore from "semaphore";
import * as WebSocket from "ws";
import {StringUtil} from "../../Utility/StringUtil";
import {EventEmitter} from "events";
import * as PromiseUtil from "../../Utility/PromiseUtil";
import {IDefer} from "../../Utility/PromiseUtil";
import { acquireSemaphore } from "../../Utility/SemaphoreUtil";
import * as BluebirdPromise from "bluebird";
import {Certificate} from "../../Auth/Certificate";
import {ObjectUtil} from "../../Utility/ObjectUtil";

export class DatabaseChanges implements IDatabaseChanges {

    private _emitter = new EventEmitter();
    private _commandId: number = 0;
    private _onConnectionStatusChangedWrapped: () => void;

    private _semaphore = semaphore();

    private readonly _requestExecuter: RequestExecutor;
    private readonly _conventions: DocumentConventions;
    private readonly _database: string;

    private readonly _onDispose: () => void;
    private _client: WebSocket;

    private readonly _task;
    private _isCancelled = false;
    private _tcs: IDefer<IDatabaseChanges>;

    private readonly _confirmations: Map<number, { resolve: () => void, reject: () => void }> = new Map();
    private readonly _counters: Map<string, DatabaseConnectionState> = new Map();
    private _immediateConnection: number = 0;

    constructor(requestExecutor: RequestExecutor, databaseName: string, onDispose: () => void) {
        this._requestExecuter = requestExecutor;
        this._conventions = requestExecutor.conventions;
        this._database = databaseName;

        this._tcs = PromiseUtil.defer<IDatabaseChanges>();
        this._onDispose = onDispose;
        this._onConnectionStatusChangedWrapped = () => this._onConnectionStatusChanged();
        this._emitter.on("connectionStatus", this._onConnectionStatusChangedWrapped);
        this._task = this._doWork();
    }

    public static createClientWebSocket(requestExecutor: RequestExecutor, url: string): WebSocket {
        const authOptions = requestExecutor.getAuthOptions();
        let options = undefined as WebSocket.ClientOptions;

        if (authOptions) {
            const certificate = Certificate.createFromOptions(authOptions);
            options = certificate.toWebSocketOptions();
        }

        return new WebSocket(url, options);
    }

    private _onConnectionStatusChanged() {
        const acquiredSemContext = acquireSemaphore(this._semaphore);

        BluebirdPromise.resolve(acquiredSemContext.promise)
            .then(() => {
                if (this.connected) {
                    this._tcs.resolve(this);
                    return;
                }

                if (this._tcs.promise.isFulfilled()) {
                    this._tcs = PromiseUtil.defer<IDatabaseChanges>();
                }
            })
            .finally(() => {
                acquiredSemContext.dispose();
            });
    }

    public get connected() {
        return this._client && this._client.readyState === WebSocket.OPEN;
    }

    public on(eventName: "connectionStatus", handler: () => void);
    public on(eventName: "error", handler: (error: Error) => void);
    public on(eventName: "connectionStatus" | "error", handler) {
        this._emitter.addListener(eventName, handler);
    }

    public off(eventName: "connectionStatus", handler: () => void);
    public off(eventName: "error", handler: (error: Error) => void);
    public off(eventName: "connectionStatus" | "error", handler) {
        this._emitter.removeListener(eventName, handler);
    }

    public ensureConnectedNow(): Promise<IDatabaseChanges> {
        return Promise.resolve(this._tcs.promise);
    }

    public forIndex(indexName: string): IChangesObservable<IndexChange> {
        const counter = this._getOrAddConnectionState("indexes/" + indexName,
            "watch-index", "unwatch-index", indexName);

        return new ChangesObservable<IndexChange, DatabaseConnectionState>("Index", counter,
            notification => notification.name
                && notification.name.toLocaleLowerCase() === indexName.toLocaleLowerCase());
    }

    public get lastConnectionStateException(): Error {
        for (const counter of Array.from(this._counters.values())) {
            if (counter.lastError) {
                return counter.lastError;
            }
        }

        return null;
    }

    public forDocument(docId: string): IChangesObservable<DocumentChange> {
        const counter = this._getOrAddConnectionState("docs/" + docId, "watch-doc", "unwatch-doc", docId);

        return new ChangesObservable<DocumentChange, DatabaseConnectionState>("Document", counter,
                notification => notification.id && notification.id.toLocaleLowerCase() === docId.toLocaleLowerCase());
    }

    public forAllDocuments(): IChangesObservable<DocumentChange> {
        const counter = this._getOrAddConnectionState("all-docs", "watch-docs",
            "unwatch-docs", null);
        return new ChangesObservable<DocumentChange, DatabaseConnectionState>("Document", counter,
            () => true);
    }

    public forOperationId(operationId: number): IChangesObservable<OperationStatusChange> {
        const counter = this._getOrAddConnectionState("operations/" + operationId,
            "watch-operation", "unwatch-operation", operationId.toString());

        return new ChangesObservable<OperationStatusChange, DatabaseConnectionState>("Operation", counter,
            notification => notification.operationId === operationId);
    }

    public forAllOperations(): IChangesObservable<OperationStatusChange> {
        const counter = this._getOrAddConnectionState("all-operations", "watch-operations",
            "unwatch-operations", null);

        return new ChangesObservable<OperationStatusChange, DatabaseConnectionState>("Operation", counter,
            () => true);
    }

    public forAllIndexes(): IChangesObservable<IndexChange> {
        const counter = this._getOrAddConnectionState("all-indexes", "watch-indexes",
            "unwatch-indexes", null);
        return new ChangesObservable<IndexChange, DatabaseConnectionState>("Index", counter, () => true);
    }

    public forDocumentsStartingWith(docIdPrefix: string): IChangesObservable<DocumentChange> {
        const counter = this._getOrAddConnectionState("prefixes/" + docIdPrefix,
            "watch-prefix", "unwatch-prefix", docIdPrefix);
        return new ChangesObservable<DocumentChange, DatabaseConnectionState>("Document", counter,
            notification => notification.id
                && notification.id.toLocaleLowerCase().startsWith(docIdPrefix.toLocaleLowerCase()));
    }

    public forDocumentsInCollection(collectionName: string): IChangesObservable<DocumentChange>;
    public forDocumentsInCollection<T extends object>(type: ObjectTypeDescriptor<T>);
    public forDocumentsInCollection<T extends object = object>(
        collectionNameOrDescriptor: string | ObjectTypeDescriptor<T>): IChangesObservable<DocumentChange> {
        const collectionName: string = typeof collectionNameOrDescriptor !== "string"
            ? this._conventions.getCollectionNameForType(collectionNameOrDescriptor)
            : collectionNameOrDescriptor;

        if (!collectionName) {
            throwError("InvalidArgumentException", "CollectionName cannot be null");
        }

        const counter = this._getOrAddConnectionState("collections/" + collectionName,
            "watch-collection", "unwatch-collection", collectionName);

        return new ChangesObservable<DocumentChange, DatabaseConnectionState>("Document", counter,
            notification => notification.collectionName
                && collectionName.toLocaleLowerCase() === notification.collectionName.toLocaleLowerCase());
    }

    public dispose(): void {
        Array.from(this._confirmations.values()).forEach(confirmation => confirmation.reject());

        this._isCancelled = true;
        if (this._client) {
            this._client.close();
        }

        this._counters.clear();

        this._emitter.emit("connectionStatus");
        this._emitter.removeListener("connectionStatus", this._onConnectionStatusChangedWrapped);

        if (this._onDispose) {
           this._onDispose();
        }
    }

    private _getOrAddConnectionState(name: string, watchCommand: string, unwatchCommand, value: string):
        DatabaseConnectionState {

        let newValue = false;

        let counter: DatabaseConnectionState;

        if (!this._counters.has(name)) {
            const connectionState = new DatabaseConnectionState(() => this._send(watchCommand, value), async () => {
                try {
                    if (this.connected) {
                        await this._send(unwatchCommand, value);
                    }
                } catch (e) {
                    // if we are not connected then we unsubscribed already
                    // because connections drops with all subscriptions
                }

                const state = this._counters.get(name);
                this._counters.delete(name);
                state.dispose();
            });
            this._counters.set(name, connectionState);
            counter = connectionState;

            newValue = true;
        } else {
            counter = this._counters.get(name);
        }

        if (newValue && this._immediateConnection) {
            counter.set(counter.onConnect());
        }

        return counter;
    }

    private _send(command: string, value: string): Promise<void> {
        return new Promise<void>(((resolve, reject) => {
            let currentCommandId: number;

            const acquiredSemContext = acquireSemaphore(this._semaphore);

            BluebirdPromise.resolve(acquiredSemContext.promise)
                .then(() => {
                    currentCommandId = ++this._commandId;

                    const payload = {
                        CommandId: currentCommandId,
                        Command: command,
                        Param: value
                    };

                    this._confirmations.set(currentCommandId, { resolve, reject });
                    const payloadAsString = JSON.stringify(payload, null, 0);

                    this._client.send(payloadAsString);
                })
                .catch((err) => {
                    if (!this._isCancelled) {
                        throw err;
                    }
                })
                .timeout(15000)
                .finally(() => acquiredSemContext.dispose());
        }));
    }

    private async _doWork(): Promise<void> {
        try {
            await this._requestExecuter.getPreferredNode();
        } catch (e) {

            this._emitter.emit("connectionStatus");
            this._notifyAboutError(e);
            this._tcs.reject(e);
            return;
        }

        const urlString = this._requestExecuter.getUrl() + "/databases/" + this._database + "/changes";
        const url = StringUtil.toWebSocketPath(urlString);

        this._doWorkInternal(url);
    }

    private _doWorkInternal(url: string): void {
        if (this._isCancelled) {
            return;
        }

        if (!this.connected) {
            this._client = DatabaseChanges.createClientWebSocket(this._requestExecuter, url);

            this._client.on("open", async () => {
                this._immediateConnection = 1;

                for (const counter of this._counters.values()) {
                    counter.set(counter.onConnect());
                }

                this._emitter.emit("connectionStatus");
            });

            this._client.on("error", e =>  {
                this._notifyAboutError(e);
            });

            this._client.on("close", () => {
                if (this._reconnectClient()) {
                    setTimeout(() => this._doWorkInternal(url), 1000);
                }

                Array.from(this._confirmations.values()).forEach(v => v.reject());
                this._confirmations.clear();
            });

            this._client.on("message", (data: WebSocket.Data) => {
                this._processChanges(data as string);
            });
        }
    }

    private _reconnectClient(): boolean {
        if (this._isCancelled) {
            return false;
        }

        this._client.close();
        this._immediateConnection = 0;

        this._emitter.emit("connectionStatus");
        return true;
    }

    private _processChanges(data: string): void {
        if (this._isCancelled) {
            return;
        }
        const payloadParsed = JSON.parse(data) as Array<any>;

        try {
            for (const message of (Array.isArray(payloadParsed) ? payloadParsed : [payloadParsed])) {
                const type = message.Type;
                switch (type) {
                    case "Error":
                        const exceptionAsString = message.Exception;
                        this._notifyAboutError(exceptionAsString);
                        break;
                    case "Confirm":
                        const commandId = message.CommandId;
                        const confirmationResolver = this._confirmations.get(commandId);
                        if (confirmationResolver) {
                            confirmationResolver.resolve();
                            this._confirmations.delete(commandId);
                        }
                        break;
                    default:
                        const value = message.Value;
                        const transformedValue = ObjectUtil.transformObjectKeys(value,  { defaultTransform: "camel" });
                        this._notifySubscribers(type, transformedValue, Array.from(this._counters.values()));
                        break;
                }
            }
        } catch (err) {
            this._notifyAboutError(err);
            throwError("ChangeProcessingException", "There was an error during notification processing.",  err);
        }
    }

    private _notifySubscribers(type: string, value: any, states: DatabaseConnectionState[]): void {
        switch (type) {
            case "DocumentChange":
                states.forEach(state => state.send("Document", value));
                break;
            case "IndexChange":
                states.forEach(state => state.send("Index", value));
                break;
            case "OperationStatusChange":
                states.forEach(state => state.send("Operation", value));
                break;
            default:
                throwError("NotSupportedException");
        }
    }

    private _notifyAboutError(e: Error): void {
        if (this._isCancelled) {
            return;
        }

        this._emitter.emit("error", e);

        Array.from(this._counters.values()).forEach(state => {
            state.error(e);
        });
    }
}
