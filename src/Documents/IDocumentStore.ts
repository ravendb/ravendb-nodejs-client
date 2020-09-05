import { IDocumentSession } from "./Session/IDocumentSession";
import { IStoreAuthOptions } from "../Auth/AuthOptions";
import {
    SessionBeforeStoreEventArgs,
    SessionAfterSaveChangesEventArgs,
    SessionBeforeQueryEventArgs,
    SessionBeforeDeleteEventArgs,
    BeforeConversionToDocumentEventArgs,
    AfterConversionToDocumentEventArgs,
    BeforeConversionToEntityEventArgs, AfterConversionToEntityEventArgs, FailedRequestEventArgs
} from "./Session/SessionEvents";
import { IDisposable } from "../Types/Contracts";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor";
import { OperationExecutor } from "./Operations/OperationExecutor";
import { AbstractIndexCreationTask } from "./Indexes";
import { RequestExecutor } from "../Http/RequestExecutor";
import { DocumentConventions } from "./Conventions/DocumentConventions";
import { InMemoryDocumentSessionOperations } from "./Session/InMemoryDocumentSessionOperations";
import { BulkInsertOperation } from "./BulkInsertOperation";
import { IDatabaseChanges } from "./Changes/IDatabaseChanges";
import { DocumentSubscriptions } from "./Subscriptions/DocumentSubscriptions";
import { SessionOptions } from "./Session/SessionOptions";
import { AbstractIndexCreationTaskBase } from "./Indexes/AbstractIndexCreationTaskBase";
import { ErrorFirstCallback } from "../Types/Callbacks";
import { DatabaseSmuggler } from "./Smuggler/DatabaseSmuggler";

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

export interface DocumentStoreEventEmitter {

    on(eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    on(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): this;

    on(eventName: "beforeDispose", eventHandler: () => void): this;

    on(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;

    on(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    once(eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    once(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): this;

    once(eventName: "beforeDispose", eventHandler: () => void): this;

    once(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;

    once(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    removeListener(eventName: "failedRequest", eventHandler: (args: FailedRequestEventArgs) => void): this;

    removeListener(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): void;

    removeListener(eventName: "beforeDispose", eventHandler: () => void): void;

    removeListener(eventName: "afterDispose", eventHandler: (callback: () => void) => void): void;

    removeListener(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): void;
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

    // TBD 4.1 IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null);
    // TBD 4.1 IDisposable AggressivelyCache(string database = null);

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
    executeIndex(task: AbstractIndexCreationTaskBase): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndex(task: AbstractIndexCreationTaskBase, database: string): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndex(task: AbstractIndexCreationTask, callback: ErrorFirstCallback<void>): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndex(task: AbstractIndexCreationTask, database: string, callback: ErrorFirstCallback<void>): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(tasks: AbstractIndexCreationTask[]): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(tasks: AbstractIndexCreationTaskBase[], database: string): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(tasks: AbstractIndexCreationTask[], callback: ErrorFirstCallback<void>): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(
        tasks: AbstractIndexCreationTask[], database: string, callback: ErrorFirstCallback<void>): Promise<void>;

    /**
     * Contains authentication information: client certificate data;
     */
    authOptions: IStoreAuthOptions;

    /**
     * Gets the conventions
     */
    conventions: DocumentConventions;

    /**
     * Gets the URLs
     */
    urls: string[];

    bulkInsert(database?: string): BulkInsertOperation;

    subscriptions: DocumentSubscriptions;

    database: string;

    getRequestExecutor(databaseName?: string): RequestExecutor;

    maintenance: MaintenanceOperationExecutor;

    operations: OperationExecutor;

    smuggler: DatabaseSmuggler;

    requestTimeout(timeoutInMs: number): IDisposable;

    requestTimeout(timeoutInMs: number, database: string): IDisposable;

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
