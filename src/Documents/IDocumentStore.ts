import { IStoreAuthOptions } from "../Auth/AuthOptions";
import { DocumentConventions, RequestExecutor } from "..";
import { SessionBeforeStoreEventArgs } from "./Session/SessionEvents";
import { IDisposable } from "../Types/Contracts";
import { Todo } from "../Types";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor";
import { OperationExecutor } from "./Operations/OperationExecutor";

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

export type DocumentStoreEvent = "beforeClose" | "afterClose";

export interface DocumentStoreEventEmitter {

    on(eventName: string, eventHandler: () => void): this;
    on(eventName: "beforeClose", eventHandler: () => void): this;
    on(eventName: "afterClose", eventHandler: () => void): this;

    removeListener(eventName: string, eventHandler: () => void): void;
    removeListener(eventName: "beforeClose", eventHandler: () => void): void;
    removeListener(eventName: "afterClose", eventHandler: () => void): void;
}
export interface IDocumentStore extends
  IDisposable,
  SessionEventsProxy,
  DocumentStoreEventEmitter {

  // database: string;
  // urls: string[];
  // singleNodeUrl: string;
  // conventions: DocumentConventions;
  // operations: OperationExecutor;
  // maintenance: AdminOperationExecutor;
  // initialize(): IDocumentStore;
  // openSession(database?: string): IDocumentSession;
  // openSession(options?: ISessionOptions): IDocumentSession;
  // openSession(database?: string, options?: ISessionOptions): IDocumentSession;
  // generateId(
  //   document: object,
  //   documentType?: DocumentType,
  //   database?: string,
  //   callback?: EntityIdCallback): Promise<string>;
  // getRequestExecutor(database?: string): RequestExecutor;

    //TBD: IDatabaseChanges Changes(string database = null);
    //TBD: IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null);
    //TBD IDisposable AggressivelyCache(string database = null);

    // /**
    //  * Setup the context for no aggressive caching
    //  *
    //  * This is mainly useful for internal use inside RavenDB, when we are executing
    //  * queries that have been marked with WaitForNonStaleResults, we temporarily disable
    //  * aggressive caching.
    //  * @return Self closing context
    //  */
    // disableAggressiveCaching(): IDisposable;

    // /**
    //  * Setup the context for no aggressive caching
    //  *
    //  * This is mainly useful for internal use inside RavenDB, when we are executing
    //  * queries that have been marked with WaitForNonStaleResults, we temporarily disable
    //  * aggressive caching.
    //  * @param database Database name
    //  * @return Self closing context
    //  */
    // disableAggressiveCaching(database: string): IDisposable;

    // identifier: string;

    // /**
    //  * Initializes this instance.
    //  * @return initialized store
    //  */
    // initialize(): IDocumentStore;


    // /**
    //  * Opens the session
    //  * @return Document session
    //  */
    // openSession(): IDocumentSession;

    // /**
    //  * Opens the session for a particular database
    //  * @param database Database to use
    //  * @return Document session
    //  */
    // IDocumentSession openSession(String database);

    // /**
    //  * Opens the session with the specified options.
    //  * @param sessionOptions Session options to use
    //  * @return Document session
    //  */
    // IDocumentSession openSession(SessionOptions sessionOptions);

    // /**
    //  * Executes the index creation
    //  * @param task Index Creation task to use
    //  */
    // void executeIndex(AbstractIndexCreationTask task);

    // /**
    //  * Executes the index creation
    //  * @param task Index Creation task to use
    //  * @param database Target database
    //  */
    // void executeIndex(AbstractIndexCreationTask task, String database);

    // /**
    //  * Executes the index creation
    //  * @param tasks Index Creation tasks to use
    //  */
    // void executeIndexes(List<AbstractIndexCreationTask> tasks);

    // /**
    //  * Executes the index creation
    //  * @param tasks Index Creation tasks to use
    //  * @param database Target database
    //  */
    // void executeIndexes(List<AbstractIndexCreationTask> tasks, String database);

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
     * Gets the URL's
     * @return Store urls
     */
    urls: string[];

    //TBD: BulkInsertOperation BulkInsert(string database = null);
    //TBD: IReliableSubscriptions Subscriptions { get; }

    database: string;

    getRequestExecutor(databaseName?: string): RequestExecutor;

    maintenance: MaintenanceOperationExecutor;

    operations: OperationExecutor;
}
