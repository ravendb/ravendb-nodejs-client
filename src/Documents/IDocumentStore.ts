import { IDocumentSession } from "./Session/IDocumentSession.js";
import { IStoreAuthOptions } from "../Auth/AuthOptions.js";
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
    TopologyUpdatedEventArgs, BeforeRequestEventArgs, SucceedRequestEventArgs
} from "./Session/SessionEvents.js";
import { IDisposable } from "../Types/Contracts.js";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor.js";
import { OperationExecutor } from "./Operations/OperationExecutor.js";
import { RequestExecutor } from "../Http/RequestExecutor.js";
import { AggressiveCacheMode } from "../Http/AggressiveCacheOptions.js";
import { DocumentConventions } from "./Conventions/DocumentConventions.js";
import { InMemoryDocumentSessionOperations } from "./Session/InMemoryDocumentSessionOperations.js";
import { BulkInsertOperation } from "./BulkInsertOperation.js";
import { IDatabaseChanges } from "./Changes/IDatabaseChanges.js";
import { DocumentSubscriptions } from "./Subscriptions/DocumentSubscriptions.js";
import { SessionOptions } from "./Session/SessionOptions.js";
import { DatabaseSmuggler } from "./Smuggler/DatabaseSmuggler.js";
import { IAbstractIndexCreationTask } from "./Indexes/IAbstractIndexCreationTask.js";
import { TimeSeriesOperations } from "./TimeSeries/TimeSeriesOperations.js";
import { IHiLoIdGenerator } from "./Identity/IHiLoIdGenerator.js";
import { BulkInsertOptions } from "./BulkInsert/BulkInsertOptions.js";
import { AiOperations } from "./Operations/AI/AiOperations.js";

export interface SessionEventsProxy {
    addSessionListener(eventName: "failedRequest", eventHandler: (eventArgs: FailedRequestEventArgs) => void): this;

    addSessionListener(eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;

    addSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): this;

    addSessionListener(eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeConversionToDocument",
        eventHandler: (eventArgs: BeforeConversionToDocumentEventArgs) => void
    ): this;

    addSessionListener(
        eventName: "afterConversionToDocument",
        eventHandler: (eventArgs: AfterConversionToDocumentEventArgs) => void
    ): this;

    addSessionListener(
        eventName: "beforeConversionToEntity",
        eventHandler: (eventArgs: BeforeConversionToEntityEventArgs) => void
    ): this;

    addSessionListener(
        eventName: "afterConversionToEntity",
        eventHandler: (eventArgs: AfterConversionToEntityEventArgs) => void
    ): this;

    removeSessionListener(eventName: "failedRequest", eventHandler: (eventArgs: FailedRequestEventArgs) => void): void;

    removeSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;

    removeSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): void;

    removeSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): void;

    removeSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): void;

    removeSessionListener(
        eventName: "beforeConversionToDocument",
        eventHandler: (eventArgs: BeforeConversionToDocumentEventArgs) => void
    ): void;

    removeSessionListener(
        eventName: "afterConversionToDocument",
        eventHandler: (eventArgs: AfterConversionToDocumentEventArgs) => void
    ): void;

    removeSessionListener(
        eventName: "beforeConversionToEntity",
        eventHandler: (eventArgs: BeforeConversionToEntityEventArgs) => void
    ): void;

    removeSessionListener(
        eventName: "afterConversionToEntity",
        eventHandler: (eventArgs: AfterConversionToEntityEventArgs) => void
    ): void;
}

export type DocumentStoreEvent = "beforeDispose" | "afterDispose";

export interface SessionCreatedEventArgs {
    session: InMemoryDocumentSessionOperations;
}

export interface SessionDisposingEventArgs {
    session: InMemoryDocumentSessionOperations;
}

export interface DocumentStoreEventEmitter {

    on(eventName: "beforeRequest", eventHandler: (args: BeforeRequestEventArgs) => void): this;

    on(eventName: "succeedRequest", eventHandler: (args: SucceedRequestEventArgs) => void): this;

    on(eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    on(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): this;

    on(eventName: "beforeDispose", eventHandler: () => void): this;

    on(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;

    on(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    once(eventName: "beforeRequest", eventHandler: (args: BeforeRequestEventArgs) => void): this;

    once(eventName: "succeedRequest", eventHandler: (args: SucceedRequestEventArgs) => void): this;

    once(eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    once(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): this;

    once(eventName: "beforeDispose", eventHandler: () => void): this;

    once(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;

    once(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    removeListener(eventName: "beforeRequest", eventHandler: (args: BeforeRequestEventArgs) => void): this;

    removeListener(eventName: "succeedRequest", eventHandler: (args: SucceedRequestEventArgs) => void): this;

    removeListener(eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    removeListener(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): void;

    removeListener(eventName: "beforeDispose", eventHandler: () => void): void;

    removeListener(eventName: "afterDispose", eventHandler: (callback: () => void) => void): void;

    removeListener(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): void;
}

export interface AggressivelyCacheForOptions {
    /** Default: conventions.aggressiveCache.mode. */
    mode?: AggressiveCacheMode;
    /** Default: the store's database. */
    database?: string;
}

export interface IDocumentStore extends IDisposable,
    SessionEventsProxy,
    DocumentStoreEventEmitter {

    /**
     * Opens document session
     */
    openSession(options: SessionOptions): IDocumentSession;

    /**
     * Opens document session
     */
    openSession(database: string): IDocumentSession;

    /**
     * Opens document session
     */
    openSession(): IDocumentSession;

    /**
     * Subscribe to change notifications from the server
     */
    changes(): IDatabaseChanges;

    /**
     * Subscribe to change notifications from the server
     */
    changes(database: string): IDatabaseChanges;

    /**
     * Subscribe to change notifications from the server
     */
    changes(database: string, nodeTag: string): IDatabaseChanges;

    /**
     * Runs the action with aggressive caching: responses cached by this store are served without asking the
     * server for `duration` milliseconds. Only the action and what it starts are affected.
     */
    aggressivelyCacheFor<T>(duration: number, action: () => T | Promise<T>): Promise<T>;
    /** @see aggressivelyCacheFor */
    aggressivelyCacheFor<T>(duration: number, options: AggressivelyCacheForOptions, action: () => T | Promise<T>): Promise<T>;

    /**
     * Runs the action with aggressive caching, using conventions.aggressiveCache for duration and mode.
     */
    aggressivelyCache<T>(action: () => T | Promise<T>): Promise<T>;
    /** @see aggressivelyCache */
    aggressivelyCache<T>(database: string, action: () => T | Promise<T>): Promise<T>;

    /**
     * Runs the action without aggressive caching, also inside an aggressivelyCache* action.
     */
    disableAggressiveCaching<T>(action: () => T | Promise<T>): Promise<T>;
    /** @see disableAggressiveCaching */
    disableAggressiveCaching<T>(database: string, action: () => T | Promise<T>): Promise<T>;

    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     */
    /* TBD 4.1
    disableAggressiveCaching(): IDisposable;
    */
    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     */
    /* TBD 4.1
    disableAggressiveCaching(database: string): IDisposable;
    */

    identifier: string;

    /**
     * Initializes this instance.
     */
    initialize(): IDocumentStore;

    /**
     * Executes the index creation
     */
    executeIndex(task: IAbstractIndexCreationTask): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndex(task: IAbstractIndexCreationTask, database: string): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(tasks: IAbstractIndexCreationTask[]): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(tasks: IAbstractIndexCreationTask[], database: string): Promise<void>;

    /**
     * Contains authentication information: client certificate data;
     */
    authOptions: IStoreAuthOptions;

    hiLoIdGenerator: IHiLoIdGenerator;

    timeSeries: TimeSeriesOperations;

    ai: AiOperations;
    /**
     * Gets the conventions
     */
    conventions: DocumentConventions;

    /**
     * Gets the URLs
     */
    urls: string[];

    bulkInsert(): BulkInsertOperation;
    bulkInsert(database: string): BulkInsertOperation;
    bulkInsert(database: string, options: BulkInsertOptions): BulkInsertOperation;
    bulkInsert(options: BulkInsertOptions): BulkInsertOperation;

    subscriptions: DocumentSubscriptions;

    database: string;

    getRequestExecutor(databaseName?: string): RequestExecutor;

    maintenance: MaintenanceOperationExecutor;

    operations: OperationExecutor;

    smuggler: DatabaseSmuggler;

    requestTimeout(timeoutInMs: number): IDisposable;

    requestTimeout(timeoutInMs: number, database: string): IDisposable;

    addSessionListener(
        eventName: "sessionDisposing", eventHandler: (args: SessionDisposingEventArgs) => void): this;

    addSessionListener(
        eventName: "topologyUpdated", eventHandler: (args: TopologyUpdatedEventArgs) => void): this;

    addSessionListener(
        eventName: "succeedRequest", eventHandler: (args: SucceedRequestEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeRequest", eventHandler: (args: BeforeRequestEventArgs) => void): this;

    addSessionListener(
        eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;

    addSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeConversionToDocument", eventHandler: (eventArgs: BeforeConversionToDocumentEventArgs) => void): this;

    addSessionListener(
        eventName: "afterConversionToDocument", eventHandler: (eventArgs: AfterConversionToDocumentEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeConversionToEntity", eventHandler: (eventArgs: BeforeConversionToEntityEventArgs) => void): this;

    addSessionListener(
        eventName: "afterConversionToEntity", eventHandler: (eventArgs: AfterConversionToEntityEventArgs) => void): this;
}
