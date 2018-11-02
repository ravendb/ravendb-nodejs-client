import { IDocumentSession } from "./Session/IDocumentSession";
import { IStoreAuthOptions } from "../Auth/AuthOptions";
import {
    SessionBeforeStoreEventArgs,
    SessionAfterSaveChangesEventArgs,
    SessionBeforeQueryEventArgs,
    SessionBeforeDeleteEventArgs
} from "./Session/SessionEvents";
import { IDisposable } from "../Types/Contracts";
import { Todo } from "../Types";
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

export interface SessionEventsProxy {
    addSessionListener(eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;

    addSessionListener(eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): this;

    addSessionListener(eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): this;

    addSessionListener(eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): this;

    removeSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;

    removeSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): void;

    removeSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): void;

    removeSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): void;
}

export type DocumentStoreEvent = "beforeDispose" | "afterDispose";

export interface SessionCreatedEventArgs {
    session: InMemoryDocumentSessionOperations;
}

export interface DocumentStoreEventEmitter {

    on(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): this;

    on(eventName: "beforeDispose", eventHandler: () => void): this;

    on(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;

    on(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    once(eventName: "sessionCreated", eventHandler: (args: SessionCreatedEventArgs) => void): this;

    once(eventName: "beforeDispose", eventHandler: () => void): this;

    once(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;

    once(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

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
    openSession(database?: string): IDocumentSession;

    /**
     * Opens document session
     */
    openSession(options?: SessionOptions): IDocumentSession;

    /**
     * Opens document session
     */
    openSession(database?: string, options?: SessionOptions): IDocumentSession;

    /**
     * Subscribe to change notifications from the server
     */
    changes(): IDatabaseChanges;

    /**
     * Subscribe to change notifications from the server
     */
    changes(database: string): IDatabaseChanges;

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
    executeIndexes(tasks: AbstractIndexCreationTaskBase[]): Promise<void>;

    /**
     * Executes the index creation
     */
    executeIndexes(tasks: AbstractIndexCreationTaskBase[], database: string): Promise<void>;

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

    addSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;

    addSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): this;

    addSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): this;
}
