import {IDocumentSession, ISessionOptions} from "./Session/IDocumentSession";
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
import { OperationExecutor} from "./Operations/OperationExecutor";
import { AbstractIndexCreationTask } from "./Indexes";
import { RequestExecutor } from "../Http/RequestExecutor";
import { DocumentConventions } from "./Conventions/DocumentConventions";

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

export interface DocumentStoreEventEmitter {

    on(eventName: "beforeDispose", eventHandler: () => void): this;
    on(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;
    on(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    once(eventName: "beforeDispose", eventHandler: () => void): this;
    once(eventName: "afterDispose", eventHandler: (callback: () => void) => void): this;
    once(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): this;

    removeListener(eventName: "beforeDispose", eventHandler: () => void): void;
    removeListener(eventName: "afterDispose", eventHandler: (callback: () => void) => void): void;
    removeListener(eventName: "executorsDisposed", eventHandler: (callback: () => void) => void): void;
}
export interface IDocumentStore extends
  IDisposable,
  SessionEventsProxy,
  DocumentStoreEventEmitter {

  /**
   * 
   * Opens document session 
   * @param {string} [database] 
   * @returns {IDocumentSession} 
   * @memberof IDocumentStore
   */
  openSession(database?: string): IDocumentSession;

  /**
   * Opens document session 
   * @param {ISessionOptions} [options] 
   * @returns {IDocumentSession} 
   * @memberof IDocumentStore
   */
  openSession(options?: ISessionOptions): IDocumentSession;

  /**
   * Opens document session 
   * @param {string} [database] 
   * @param {ISessionOptions} [options] 
   * @returns {IDocumentSession} 
   * @memberof IDocumentStore
   */
  openSession(database?: string, options?: ISessionOptions): IDocumentSession;

    // TBD: IDatabaseChanges Changes(string database = null);
    // TBD: IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null);
    // TBD IDisposable AggressivelyCache(string database = null);

    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     * @returns Disposable context
     */
    disableAggressiveCaching(): IDisposable;

    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     * @param database Database name
     * @returns Disposable context
     */
    disableAggressiveCaching(database: string): IDisposable;

    identifier: string;

    /**
     * Initializes this instance.
     * @returns initialized store
     */
    initialize(): IDocumentStore;

    /**
     * Executes the index creation
     * @param task Index Creation task to use
     * @param database Target database
     */
    executeIndex(task: AbstractIndexCreationTask): Promise<void>;
    executeIndex(task: AbstractIndexCreationTask, database: string): Promise<void>;

    /**
     * Executes the index creation
     * 
     * @param {AbstractIndexCreationTask[]} tasks 
     * @returns {Promise<void>} 
     * @memberof IDocumentStore
     */
    executeIndexes(tasks: AbstractIndexCreationTask[]): Promise<void>;
    executeIndexes(tasks: AbstractIndexCreationTask[], database: string): Promise<void>;

    /**
     * Contains authentication information: client certificate data;
     * @returns Authentication options
     */
    authOptions: IStoreAuthOptions;

    /**
     * Gets the conventions
     * @return Document conventions
     */
    conventions: DocumentConventions;

    /**
     * Gets the URLs
     * @return Store urls
     */
    urls: string[];

    // TBD: BulkInsertOperation BulkInsert(string database = null);
    // TBD: IReliableSubscriptions Subscriptions { get; }

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
