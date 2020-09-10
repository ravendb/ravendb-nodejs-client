import { IDatabaseChanges } from "./IDatabaseChanges";
import { IChangesObservable } from "./IChangesObservable";
import { IndexChange, TopologyChange } from "./IndexChange";
import { CounterChange } from "./CounterChange";
import { DocumentChange } from "./DocumentChange";
import { OperationStatusChange } from "./OperationStatusChange";
import { DatabaseConnectionState } from "./DatabaseConnectionState";
import { ChangesObservable } from "./ChangesObservable";
import { throwError } from "../../Exceptions";
import * as semaphore from "semaphore";
import * as WebSocket from "ws";
import { StringUtil } from "../../Utility/StringUtil";
import { EventEmitter } from "events";
import * as PromiseUtil from "../../Utility/PromiseUtil";
import { IDefer } from "../../Utility/PromiseUtil";
import { acquireSemaphore } from "../../Utility/SemaphoreUtil";
import { Certificate } from "../../Auth/Certificate";
import { ObjectUtil } from "../../Utility/ObjectUtil";
import CurrentIndexAndNode from "../../Http/CurrentIndexAndNode";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";
import { ObjectTypeDescriptor } from "../../Types";
import { UpdateTopologyParameters } from "../../Http/UpdateTopologyParameters";

export class DatabaseChanges implements IDatabaseChanges {

    private _emitter = new EventEmitter();
    private _commandId: number = 0;
    private readonly _onConnectionStatusChangedWrapped: () => void;

    private _semaphore = semaphore();

    private readonly _requestExecutor: RequestExecutor;
    private readonly _conventions: DocumentConventions;
    private readonly _database: string;

    private readonly _onDispose: () => void;
    private _client: WebSocket;

    private readonly _task;
    private _isCanceled = false;
    private _tcs: IDefer<IDatabaseChanges>;

    private readonly _confirmations: Map<number, { resolve: () => void, reject: () => void }> = new Map();
    private readonly _counters: Map<string, DatabaseConnectionState> = new Map(); //TODO: use DatabaseChangesOptions as key?
    private _immediateConnection: number = 0;

    private _serverNode: ServerNode;
    private _nodeIndex: number;
    private _url: string;

    constructor(requestExecutor: RequestExecutor, databaseName: string, onDispose: () => void, nodeTag: string) {
        this._requestExecutor = requestExecutor;
        this._conventions = requestExecutor.conventions;
        this._database = databaseName;

        this._tcs = PromiseUtil.defer<IDatabaseChanges>();
        this._onDispose = onDispose;
        this._onConnectionStatusChangedWrapped = () => this._onConnectionStatusChanged();
        this._emitter.on("connectionStatus", this._onConnectionStatusChangedWrapped);
        this._task = this._doWork(nodeTag);
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

    private async _onConnectionStatusChanged() {
        const acquiredSemContext = acquireSemaphore(this._semaphore);

        try {
            await acquiredSemContext.promise;
            
            if (this.connected) {
                this._tcs.resolve(this);
                return;
            }

            if (this._tcs.promise.isFulfilled()) {
                this._tcs = PromiseUtil.defer<IDatabaseChanges>();
            }
        } finally {
            acquiredSemContext.dispose();
        }
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
        if (StringUtil.isNullOrWhitespace(indexName)) {
            throwError("InvalidArgumentException", "IndexName cannot be null or whitespace.");
        }

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
        if (StringUtil.isNullOrWhitespace(docId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or whitespace.");
        }

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
        if (StringUtil.isNullOrWhitespace(docIdPrefix)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or whitespace.");
        }

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
        for (const confirmation of this._confirmations.values()) {
            confirmation.reject();
        }

        this._isCanceled = true;
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

    private _getOrAddConnectionState(
        name: string, watchCommand: string, unwatchCommand, value: string, values: string[] = null):
        DatabaseConnectionState {

        let newValue = false;

        let counter: DatabaseConnectionState;

        if (!this._counters.has(name)) {
            const connectionState = new DatabaseConnectionState(
                () => this._send(watchCommand, value, values), async () => {
                    try {
                        if (this.connected) {
                            await this._send(unwatchCommand, value, values);
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

    private _send(command: string, value: string, values: string[]): Promise<void> {
        return new Promise<void>((async (resolve, reject) => {
            let currentCommandId: number;

            const acquiredSemContext = acquireSemaphore(this._semaphore, {
                timeout: 15000,
                contextName: "DatabaseChanges._send()"
            });

            try {
                await acquiredSemContext.promise;

                currentCommandId = ++this._commandId;

                const payload = {
                    CommandId: currentCommandId,
                    Command: command,
                    Param: value
                };

                if (values && values.length) {
                    payload["Params"] = values;
                }

                this._confirmations.set(currentCommandId, { resolve, reject });
                const payloadAsString = JSON.stringify(payload, null, 0);

                this._client.send(payloadAsString);
            } catch (err) {
                if (!this._isCanceled) {
                    throw err;
                }
            } finally {
                if (acquiredSemContext) {
                    acquiredSemContext.dispose();
                }
            }
        }));
    }

    private async _doWork(nodeTag: string): Promise<void> {
        let preferredNode: CurrentIndexAndNode;
        try {
            preferredNode = nodeTag ? await this._requestExecutor.getRequestedNode(nodeTag) : await this._requestExecutor.getPreferredNode();
            this._nodeIndex = preferredNode.currentIndex;
            this._serverNode = preferredNode.currentNode;
        } catch (e) {
            this._emitter.emit("connectionStatus");
            this._notifyAboutError(e);
            this._tcs.reject(e);
            return;
        }

        this._doWorkInternal(preferredNode);
    }

    private _doWorkInternal(preferredNode: CurrentIndexAndNode): void {
        if (this._isCanceled) {
            return;
        }

        let wasConnected = false;

        if (!this.connected) {
            const urlString = preferredNode.currentNode.url + "/databases/" + this._database + "/changes";
            const url = StringUtil.toWebSocketPath(urlString);

            this._client = DatabaseChanges.createClientWebSocket(this._requestExecutor, url);

            this._client.on("open", async () => {
                wasConnected = true;
                this._immediateConnection = 1;

                for (const counter of this._counters.values()) {
                    counter.set(counter.onConnect());
                }

                this._emitter.emit("connectionStatus");
            });

            this._client.on("error", async (e) => {
                if (wasConnected) {
                    this._emitter.emit("connectionStatus");
                }
                wasConnected = false;

                try {
                    this._serverNode = await this._requestExecutor.handleServerNotResponsive(this._url, this._serverNode, this._nodeIndex, e);
                } catch (ee) {
                    //We don't want to stop observe for changes if server down. we will wait for one to be up
                }
                this._notifyAboutError(e);
            });

            this._client.on("close", () => {
                if (this._reconnectClient()) {
                    setTimeout(() => this._doWorkInternal(preferredNode), 1000);
                }

                for (const confirm of this._confirmations.values()) {
                    confirm.reject();
                }

                this._confirmations.clear();
            });

            this._client.on("message", async (data: WebSocket.Data) => {
                await this._processChanges(data as string);
            });
        }
    }

    private _reconnectClient(): boolean {
        if (this._isCanceled) {
            return false;
        }

        this._client.close();
        this._immediateConnection = 0;

        return true;
    }

    private async _processChanges(data: string): Promise<void> {
        if (this._isCanceled) {
            return;
        }
        const payloadParsed = JSON.parse(data) as any[];

        try {
            const messages = Array.isArray(payloadParsed) ? payloadParsed : [payloadParsed];
            for (const message of messages) {
                const type = message.Type;
                if (message.TopologyChange) {
                    this._getOrAddConnectionState("Topology", "watch-topology-change", "", "");

                    const updateParameters = new UpdateTopologyParameters(this._serverNode);
                    updateParameters.timeoutInMs = 0; //TODO: check if 0 means unbounded or system default
                    updateParameters.forceUpdate = true;
                    updateParameters.debugTag = "watch-topology-change";
                    // noinspection ES6MissingAwait
                    this._requestExecutor.updateTopology(updateParameters);
                    continue;
                }
                if (!type) {
                    continue;
                }
                
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
                        const transformedValue = ObjectUtil.transformObjectKeys(value, { defaultTransform: "camel" });
                        this._notifySubscribers(type, transformedValue, Array.from(this._counters.values()));
                        break;
                }
            }
        } catch (err) {
            this._notifyAboutError(err);
            throwError("ChangeProcessingException", "There was an error during notification processing.", err);
        }
    }

    private _notifySubscribers(type: string, value: any, states: DatabaseConnectionState[]): void {
        switch (type) {
            case "DocumentChange":
                states.forEach(state => state.send("Document", value));
                break;
            case "CounterChange":
                states.forEach(state => state.send("Counter", value));
                break;
            case "IndexChange":
                states.forEach(state => state.send("Index", value));
                break;
            case "OperationStatusChange":
                states.forEach(state => state.send("Operation", value));
                break;
            case "TopologyChange":
                const topologyChange = value as TopologyChange;
                const requestExecutor = this._requestExecutor;
                if (requestExecutor) {
                    const node = new ServerNode({
                        url: topologyChange.url,
                        database: topologyChange.database
                    });

                    const updateParameters = new UpdateTopologyParameters(node);
                    updateParameters.timeoutInMs = 0;
                    updateParameters.forceUpdate = true;
                    updateParameters.debugTag = "topology-change-notification";

                    requestExecutor.updateTopology(updateParameters);
                }
                break;
            default:
                throwError("NotSupportedException");
        }
    }

    private _notifyAboutError(e: Error): void {
        if (this._isCanceled) {
            return;
        }

        this._emitter.emit("error", e);

        for (const state of this._counters.values()) {
            state.error(e);
        }
    }

    public forAllCounters(): IChangesObservable<CounterChange> {
        const counter = this._getOrAddConnectionState("all-counters", "watch-counters", "unwatch-counters", null);
        const taskedObservable = new ChangesObservable<CounterChange, DatabaseConnectionState>(
            "Counter", counter, notification => true);
        return taskedObservable;
    }

    public forCounter(counterName: string): IChangesObservable<CounterChange> {
        if (StringUtil.isNullOrWhitespace(counterName)) {
            throwError("InvalidArgumentException", "CounterName cannot be null or whitespace.");
        }

        const counter = this._getOrAddConnectionState(
            "counter/" + counterName, "watch-counter", "unwatch-counter", counterName);
        const taskedObservable = new ChangesObservable<CounterChange, DatabaseConnectionState>(
                "Counter", counter, notification => StringUtil.equalsIgnoreCase(counterName, notification.name));
        return taskedObservable;
    }

    public forCounterOfDocument(documentId: string, counterName: string): IChangesObservable<CounterChange> {
        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or whitespace.");
        }

        if (StringUtil.isNullOrWhitespace(counterName)) {
            throwError("InvalidArgumentException", "CounterName cannot be null or whitespace.");
        }

        const counter = this._getOrAddConnectionState(
            "document/" + documentId + "/counter/" + counterName, 
            "watch-document-counter", 
            "unwatch-document-counter", 
            null, 
            [ documentId, counterName ]);
        const taskedObservable = new ChangesObservable<CounterChange, DatabaseConnectionState>(
            "Counter", counter,
            notification => StringUtil.equalsIgnoreCase(documentId, notification.documentId)
                && StringUtil.equalsIgnoreCase(counterName, notification.name));
        return taskedObservable;
    }

    public forCountersOfDocument(documentId: string): IChangesObservable<CounterChange> {
        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError(
                "InvalidArgumentException", 
                "DocumentId cannot be null or whitespace.");
        }
        
        const counter = this._getOrAddConnectionState(
            "document/" + documentId + "/counter", "watch-document-counters", "unwatch-document-counters", documentId);
        const taskedObservable = new ChangesObservable<CounterChange, DatabaseConnectionState>(
            "Counter", 
            counter,
            notification => StringUtil.equalsIgnoreCase(documentId, notification.documentId));
        return taskedObservable;
    }
}
