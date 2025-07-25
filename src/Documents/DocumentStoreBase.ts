import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor.js";
import { EventEmitter } from "node:events";
import { IDocumentStore, SessionDisposingEventArgs } from "./IDocumentStore.js";
import { throwError } from "../Exceptions/index.js";
import { validateUri } from "../Utility/UriUtil.js";
import { IAuthOptions } from "../Auth/AuthOptions.js";
import {
    SessionBeforeStoreEventArgs,
    SessionAfterSaveChangesEventArgs,
    SessionBeforeQueryEventArgs,
    SessionBeforeDeleteEventArgs,
    BeforeConversionToDocumentEventArgs,
    AfterConversionToDocumentEventArgs,
    BeforeConversionToEntityEventArgs,
    AfterConversionToEntityEventArgs,
    FailedRequestEventArgs,
    TopologyUpdatedEventArgs,
    BeforeRequestEventArgs,
    SucceedRequestEventArgs
} from "./Session/SessionEvents.js";
import { OperationExecutor } from "./Operations/OperationExecutor.js";
import { IDocumentSession } from "./Session/IDocumentSession.js";
import { DocumentSession } from "./Session/DocumentSession.js";
import { DocumentConventions } from "./Conventions/DocumentConventions.js";
import { RequestExecutor } from "../Http/RequestExecutor.js";
import { IndexCreation } from "./Indexes/IndexCreation.js";
import { PutIndexesOperation } from "./Operations/Indexes/PutIndexesOperation.js";
import { BulkInsertOperation } from "./BulkInsertOperation.js";
import { IDatabaseChanges } from "./Changes/IDatabaseChanges.js";
import { DocumentSubscriptions } from "./Subscriptions/DocumentSubscriptions.js";
import { DocumentStore } from "./DocumentStore.js";
import { TypeUtil } from "../Utility/TypeUtil.js";
import { CaseInsensitiveKeysMap } from "../Primitives/CaseInsensitiveKeysMap.js";
import { SessionOptions } from "./Session/SessionOptions.js";
import { DatabaseSmuggler } from "./Smuggler/DatabaseSmuggler.js";
import { IDisposable } from "../Types/Contracts.js";
import { TimeSeriesOperations } from "./TimeSeries/TimeSeriesOperations.js";
import { IAbstractIndexCreationTask } from "./Indexes/IAbstractIndexCreationTask.js";
import { StringUtil } from "../Utility/StringUtil.js";
import { IHiLoIdGenerator } from "./Identity/IHiLoIdGenerator.js";
import { BulkInsertOptions } from "./BulkInsert/BulkInsertOptions.js";
import { AiOperations } from "./AI/AiOperations.js";

export abstract class DocumentStoreBase
    extends EventEmitter
    implements IDocumentStore {

    /* TBD 4.1
    public abstract disableAggressiveCaching(): IDisposable;
    public abstract disableAggressiveCaching(database: string): IDisposable;
    */

    protected constructor() {
        super();
        this._subscriptions = new DocumentSubscriptions(this as any as DocumentStore);
    }

    public abstract dispose(): void;

    protected _disposed: boolean;

    public isDisposed(): boolean {
        return this._disposed;
    }

    // TBD: public abstract IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null);

    public abstract changes(): IDatabaseChanges;
    public abstract changes(database: string): IDatabaseChanges;
    public abstract changes(database: string, nodeTag: string): IDatabaseChanges;

    // TBD: public abstract IDisposable DisableAggressiveCaching(string database = null);

    public abstract identifier: string;

    public abstract hiLoIdGenerator: IHiLoIdGenerator;

    public abstract initialize(): IDocumentStore;

    public abstract openSession(): IDocumentSession;
    public abstract openSession(database: string): IDocumentSession;
    public abstract openSession(sessionOptions: SessionOptions): IDocumentSession;

    public executeIndex(task: IAbstractIndexCreationTask): Promise<void>;
    public executeIndex(task: IAbstractIndexCreationTask, database: string): Promise<void>;
    public executeIndex(
        task: IAbstractIndexCreationTask,
        database?: string): Promise<void> {
        this.assertInitialized();
        return task.execute(this, this.conventions, database);
    }

    public async executeIndexes(tasks: IAbstractIndexCreationTask[]): Promise<void>;
    public async executeIndexes(tasks: IAbstractIndexCreationTask[], database: string): Promise<void>;
    public async executeIndexes(tasks: IAbstractIndexCreationTask[], database?: string): Promise<void> {
        this.assertInitialized();
        const indexesToAdd = IndexCreation.createIndexesToAdd(tasks, this.conventions);

        await this.maintenance
            .forDatabase(this.getEffectiveDatabase(database))
            .send(new PutIndexesOperation(...indexesToAdd));
    }

    private _timeSeriesOperation: TimeSeriesOperations;

    public get timeSeries() {
        if (!this._timeSeriesOperation) {
            this._timeSeriesOperation = new TimeSeriesOperations(this);
        }

        return this._timeSeriesOperation;
    }

    private _aiOperations: AiOperations;

    public get ai() {
        if (!this._aiOperations) {
            this._aiOperations = new AiOperations(this);
        }

        return this._aiOperations;
    }

    private _conventions: DocumentConventions;

    public get conventions() {
        if (!this._conventions) {
            this._conventions = new DocumentConventions();
        }

        return this._conventions;
    }

    public set conventions(value) {
        this._assertNotInitialized("conventions");
        this._conventions = value;
    }

    protected _urls: string[] = [];

    public get urls() {
        return this._urls;
    }

    public set urls(value: string[]) {
        this._assertNotInitialized("urls");

        if (!value || !Array.isArray(value)) {
            throwError("InvalidArgumentException",
                `Invalid urls array passed: ${value.toString()}.`);
        }

        for (let i = 0; i < value.length; i++) {
            if (!value[i]) {
                throwError("InvalidArgumentException",
                    `Url cannot be null or undefined - url index: ${i}`);
            }

            validateUri(value[i]);

            value[i] = value[i].replace(/\/$/, "");
        }

        this._urls = value;
    }

    protected _initialized: boolean;

    private _authOptions: IAuthOptions;

    public abstract bulkInsert(): BulkInsertOperation;
    public abstract bulkInsert(database: string): BulkInsertOperation;
    public abstract bulkInsert(database: string, options: BulkInsertOptions): BulkInsertOperation;
    public abstract bulkInsert(options: BulkInsertOptions): BulkInsertOperation;

    private readonly _subscriptions: DocumentSubscriptions;

    public get subscriptions(): DocumentSubscriptions {
        return this._subscriptions;
    }

    private readonly _lastRaftIndexPerDatabase: Map<string, number> = CaseInsensitiveKeysMap.create();

    public getLastTransactionIndex(database: string): number {
        const index = this._lastRaftIndexPerDatabase.get(database);
        if (!index) {
            return null;
        }

        return index;
    }

    public setLastTransactionIndex(database: string, index: number): void {
        if (!index) {
            return;
        }

        const initialValue = this._lastRaftIndexPerDatabase.get(database);
        const result = TypeUtil.isUndefined(initialValue)
            ? index
            : Math.max(initialValue, index);
        this._lastRaftIndexPerDatabase.set(database, result);
    }

    protected _ensureNotDisposed(): void {
        if (this._disposed) {
            throwError("InvalidOperationException", "The document store has already been disposed and cannot be used");
        }
    }

    public assertInitialized(): void {
        if (!this._initialized) {
            throwError("InvalidOperationException",
                "You cannot open a session or access the database commands before initializing the document store. "
                + "Did you forget calling initialize()?");
        }
    }

    private _assertNotInitialized(property: string) {
        if (this._initialized) {
            throwError("InvalidOperationException",
                "You cannot set '" + property + "' after the document store has been initialized.");
        }
    }

    protected _database: string;

    public get database(): string {
        return this._database;
    }

    public set database(value) {
        this._assertNotInitialized("database");
        this._database = value;
    }

    public get authOptions(): IAuthOptions {
        return this._authOptions;
    }

    public set authOptions(value: IAuthOptions) {
        this._assertNotInitialized("authOptions");
        this._authOptions = value;
    }

    public abstract get smuggler(): DatabaseSmuggler;

    public abstract getRequestExecutor(databaseName?: string): RequestExecutor;

    // TBD public IDisposable AggressivelyCache(string database = null)

    protected _eventHandlers: [string, (eventArgs: any) => void][] = [];

    public addSessionListener(
        eventName: "sessionDisposing", eventHandler: (eventArgs: SessionDisposingEventArgs) => void): this;
    public addSessionListener(
        eventName: "failedRequest", eventHandler: (eventArgs: FailedRequestEventArgs) => void): this;
    public addSessionListener(
        eventName: "topologyUpdated", eventHandler: (eventArgs: TopologyUpdatedEventArgs) => void): this;
    public addSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;
    public addSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): this;
    public addSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): this;
    public addSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): this;
    public addSessionListener(
        eventName: "beforeConversionToDocument",
        eventHandler: (eventArgs: BeforeConversionToDocumentEventArgs) => void
    ): this;
    public addSessionListener(
        eventName: "afterConversionToDocument",
        eventHandler: (eventArgs: AfterConversionToDocumentEventArgs) => void
    ): this;
    public addSessionListener(
        eventName: "beforeConversionToEntity",
        eventHandler: (eventArgs: BeforeConversionToEntityEventArgs) => void
    ): this;
    public addSessionListener(
        eventName: "afterConversionToEntity",
        eventHandler: (eventArgs: AfterConversionToEntityEventArgs) => void
    ): this;
    public addSessionListener(
        eventName: "beforeRequest",
        eventHandler: (eventArgs: BeforeRequestEventArgs) => void
    ): this;
    public addSessionListener(
        eventName: "succeedRequest",
        eventHandler: (eventArgs: SucceedRequestEventArgs) => void
    ): this;
    public addSessionListener(eventName: any, eventHandler: (eventArgs: any) => void): this {
        this._eventHandlers.push([eventName, eventHandler]);
        return this;
    }

    public removeSessionListener(
        eventName: "failedRequest", eventHandler: (eventArgs: FailedRequestEventArgs) => void): void;
    public removeSessionListener(
        eventName: "topologyUpdated", eventHandler: (eventArgs: TopologyUpdatedEventArgs) => void): void;
    public removeSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;
    public removeSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): void;
    public removeSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): void;
    public removeSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): void;
    public removeSessionListener(
        eventName: "beforeConversionToDocument",
        eventHandler: (eventArgs: BeforeConversionToDocumentEventArgs) => void
    ): void;
    public removeSessionListener(
        eventName: "afterConversionToDocument",
        eventHandler: (eventArgs: AfterConversionToDocumentEventArgs) => void
    ): void;
    public removeSessionListener(
        eventName: "beforeConversionToEntity",
        eventHandler: (eventArgs: BeforeConversionToEntityEventArgs) => void
    ): void;
    public removeSessionListener(
        eventName: "afterConversionToEntity",
        eventHandler: (eventArgs: AfterConversionToEntityEventArgs) => void
    ): void;
    public removeSessionListener(
        eventName: "beforeRequest",
        eventHandler: (eventArgs: BeforeRequestEventArgs) => void
    ): void;
    public removeSessionListener(
        eventName: "succeedRequest",
        eventHandler: (eventArgs: SucceedRequestEventArgs) => void
    ): void;
    public removeSessionListener(eventName: any, eventHandler: (eventArgs: any) => void): void {
        const toRemove = this._eventHandlers
            .find(x => x[0] === eventName && x[1] === eventHandler);
        if (toRemove) {
            this._eventHandlers.splice(this._eventHandlers.indexOf(toRemove), 1);
        }
    }

    public registerEvents(requestExecutor: RequestExecutor): void;
    public registerEvents(session: DocumentSession): void;
    public registerEvents(requestExecutorOrSession: RequestExecutor | DocumentSession): void {
        for (const [eventName, eventHandler] of this._eventHandlers) {
            if (eventName === "failedRequest"
                || eventName === "topologyUpdated"
                || eventName === "beforeRequest"
                || eventName === "succeedRequest") {
                (requestExecutorOrSession as RequestExecutor).on(eventName as any, eventHandler);
            } else {
                (requestExecutorOrSession as DocumentSession).on(eventName, eventHandler);
            }
        }
    }

    public abstract maintenance: MaintenanceOperationExecutor;

    public abstract operations: OperationExecutor;

    public abstract requestTimeout(timeoutInMs: number): IDisposable;

    public abstract requestTimeout(timeoutInMs: number, database: string): IDisposable;

    protected _assertValidConfiguration(): void {
        this.conventions.validate();
    }

    public getEffectiveDatabase(database: string): string {
        return DocumentStoreBase.getEffectiveDatabase(this, database);
    }

    public static getEffectiveDatabase(store: IDocumentStore, database: string) {
        if (!database) {
            database = store.database;
        }

        if (!StringUtil.isNullOrWhitespace(database)) {
            return database;
        }

        throwError("InvalidArgumentException", "Cannot determine database to operate on. " +
            "Please either specify 'database' directly as an action parameter " +
            "or set the default database to operate on using 'DocumentStore.database' property. " +
            "Did you forget to pass 'database' parameter?");
    }
}
