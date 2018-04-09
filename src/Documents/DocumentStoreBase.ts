import {MaintenanceOperationExecutor} from "./Operations/MaintenanceOperationExecutor";
import { EventEmitter } from "events";
import { IDocumentStore } from "./IDocumentStore";
// import { IDocumentSession } from "./Session";
import { DocumentConventions, RequestExecutor } from "..";
import { throwError } from "../Exceptions";
import { isValidUri, validateUri } from "../Utility/UriUtil";
import { IAuthOptions } from "../Auth/AuthOptions";
import { SessionBeforeStoreEventArgs } from "./Session/SessionEvents";
import { Todo } from "../Types";
import { InMemoryDocumentSessionOperations } from "./Session/InMemoryDocumentSessionOperations";
import { OperationExecutor } from "./Operations/OperationExecutor";


export abstract class DocumentStoreBase 
    extends EventEmitter 
    implements IDocumentStore {

    protected constructor() {
        super();
        // TBD: Subscriptions = new DocumentSubscriptions(this);
    }

    public abstract dispose(): void;

    protected _disposed: boolean;

    public isDisposed(): boolean {
        return this._disposed;
    }

    // TBD: public abstract IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null);

    // TBD: public abstract IDatabaseChanges Changes(string database = null);

    // TBD: public abstract IDisposable DisableAggressiveCaching(string database = null);

    public abstract identifier: string;

    public abstract initialize(): IDocumentStore;

    //public abstract openSession(): IDocumentSession;

    //public abstract IDocumentSession openSession(String database);

    //public abstract IDocumentSession openSession(SessionOptions sessionOptions);

    // public void executeIndex(AbstractIndexCreationTask task) {
    //     executeIndex(task, null);
    // }

    // public void executeIndex(AbstractIndexCreationTask task, String database) {
    //     assertInitialized();
    //     task.execute(this, conventions, database);
    // }

    // @Override
    // public void executeIndexes(List<AbstractIndexCreationTask> tasks) {
    //     executeIndexes(tasks, null);
    // }

    // @Override
    // public void executeIndexes(List<AbstractIndexCreationTask> tasks, String database) {
    //     assertInitialized();
    //     IndexDefinition[] indexesToAdd = IndexCreation.createIndexesToAdd(tasks, conventions);

    //     maintenance()
    //             .forDatabase(ObjectUtils.firstNonNull(database, getDatabase()))
    //             .send(new PutIndexesOperation(indexesToAdd));
    // }

    private _conventions: DocumentConventions;

    public get conventions() {
        if (!this._conventions) {
            this._conventions = new DocumentConventions();
        }

        return this._conventions;
    }

    public set conventions(value) {
        this._conventions = value;
    }

    protected _urls: string[] = [];

    public get urls() {
        return this._urls;
    }

    public set urls(value: string[]) {
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

    //TBD: public abstract BulkInsertOperation BulkInsert(string database = null);
    //TBD: public IReliableSubscriptions Subscriptions { get; }

    protected _ensureNotDisposed(): void {
        if (this._disposed) {
            throwError("InvalidOperationException", "The document store has already been disposed and cannot be used");
        }
    }

    protected _assertInitialized(): void {
        if (!this._initialized) {
            throwError(
                "You cannot open a session or access the database commands before initializing the document store. "
                + "Did you forget calling initialize()?",
            "InvalidOperationException");
        }
    }

    protected _database: string;

    public get database(): string {
        return this._database;
    }

    public set database(value) {
        this._database = value;
    }

    public get authOptions(): IAuthOptions {
        return this._authOptions;
    }

    public set authOptions(value: IAuthOptions) {
        this._authOptions = value;
    }

    public abstract getRequestExecutor(databaseName?: string): RequestExecutor;

    // TBD public IDisposable AggressivelyCache(string database = null)

    protected _eventHandlers: Array<[string, (eventArgs: any) => void]> = [];

    public addSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;
    public addSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): this;
    public addSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): this;
    public addSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): this;
    public addSessionListener(eventName: any, eventHandler: (eventArgs: any) => void): this {
        this._eventHandlers.push([eventName, eventHandler]);
        return this;
    }
    
    public removeSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;
    public removeSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): void;
    public removeSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): void;
    public removeSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): void;
    public removeSessionListener(eventName: any, eventHandler: (eventArgs: any) => void): void {
        const toRemove = this._eventHandlers
            .filter(x => x[0] === eventName && x[1] === eventHandler)[0];
        if (toRemove) {
            this._eventHandlers.splice(this._eventHandlers.indexOf(toRemove), 1);
        }
    }

    protected _registerEvents(session: InMemoryDocumentSessionOperations): void {
        this._eventHandlers.forEach(([eventName, eventHandler]) => {
            session.on(eventName, eventHandler);
        });
    }

    public abstract maintenance: MaintenanceOperationExecutor;

    public abstract operations: OperationExecutor;

}