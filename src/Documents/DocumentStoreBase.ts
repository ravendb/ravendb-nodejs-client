import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor";
import { EventEmitter } from "events";
import { IDocumentStore } from "./IDocumentStore";
import { throwError } from "../Exceptions";
import { validateUri } from "../Utility/UriUtil";
import { IAuthOptions } from "../Auth/AuthOptions";
import {
    SessionBeforeStoreEventArgs,
    SessionAfterSaveChangesEventArgs,
    SessionBeforeQueryEventArgs,
    SessionBeforeDeleteEventArgs
} from "./Session/SessionEvents";
import { Todo } from "../Types";
import { OperationExecutor } from "./Operations/OperationExecutor";
import { IDocumentSession } from "./Session/IDocumentSession";
import { DocumentSession } from "./Session/DocumentSession";
import { DocumentConventions } from "./Conventions/DocumentConventions";
import { RequestExecutor } from "../Http/RequestExecutor";
import { IndexCreation } from "../Documents/Indexes/IndexCreation";
import { PutIndexesOperation } from "./Operations/Indexes/PutIndexesOperation";
import { BulkInsertOperation } from "./BulkInsertOperation";
import { IDatabaseChanges } from "./Changes/IDatabaseChanges";
import { DocumentSubscriptions } from "./Subscriptions/DocumentSubscriptions";
import { DocumentStore } from "./DocumentStore";
import { TypeUtil } from "../Utility/TypeUtil";
import { AbstractIndexCreationTaskBase } from "./Indexes/AbstractIndexCreationTaskBase";
import { CaseInsensitiveKeysMap } from "../Primitives/CaseInsensitiveKeysMap";
import { ErrorFirstCallback } from "../Types/Callbacks";
import { passResultToCallback } from "../Utility/PromiseUtil";
import { AbstractIndexCreationTask } from "./Indexes/AbstractIndexCreationTask";
import { SessionOptions } from "./Session/SessionOptions";

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

    // TBD: public abstract IDisposable DisableAggressiveCaching(string database = null);

    public abstract identifier: string;

    public abstract initialize(): IDocumentStore;

    public abstract openSession(): IDocumentSession;
    public abstract openSession(database: string): IDocumentSession;
    public abstract openSession(sessionOptions: SessionOptions): IDocumentSession;

    public executeIndex(task: AbstractIndexCreationTask): Promise<void>;
    public executeIndex(task: AbstractIndexCreationTask, database: string): Promise<void>;
    public executeIndex(task: AbstractIndexCreationTask, callback: ErrorFirstCallback<void>): Promise<void>;
    public executeIndex(
        task: AbstractIndexCreationTask, 
        database: string, 
        callback: ErrorFirstCallback<void>): Promise<void>;
    public executeIndex(
        task: AbstractIndexCreationTask, 
        databaseOrCallback?: string | ErrorFirstCallback<void>, 
        callback?: ErrorFirstCallback<void>): Promise<void> {
        this.assertInitialized();
        const database = TypeUtil.isFunction(databaseOrCallback)
            ? null
            : databaseOrCallback as string;
        const resultPromise = task.execute(this, this.conventions, database);
        passResultToCallback(resultPromise, callback || TypeUtil.NOOP);
        return resultPromise;
    }

    public async executeIndexes(tasks: AbstractIndexCreationTask[]): Promise<void>;
    public async executeIndexes(
        tasks: AbstractIndexCreationTask[], callback: ErrorFirstCallback<void>): Promise<void>;
    public async executeIndexes(tasks: AbstractIndexCreationTask[], database: string): Promise<void>;
    public async executeIndexes(
        tasks: AbstractIndexCreationTask[], database: string, callback: ErrorFirstCallback<void>): Promise<void>;
    public async executeIndexes(
        tasks: AbstractIndexCreationTask[], 
        databaseOrCallback?: string | ErrorFirstCallback<void>, 
        callback?: ErrorFirstCallback<void>): Promise<void> {
        this.assertInitialized();
        const indexesToAdd = IndexCreation.createIndexesToAdd(tasks, this.conventions);
        const database = TypeUtil.isFunction(databaseOrCallback)
            ? null
            : databaseOrCallback as string;

        const resultPromise = this.maintenance
            .forDatabase(database || this.database)
            .send(new PutIndexesOperation(...indexesToAdd))
            .then(() => {});
        
        passResultToCallback(resultPromise, callback || TypeUtil.NOOP);
        return resultPromise;
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

    public abstract bulkInsert(database?: string): BulkInsertOperation;

    private readonly _subscriptions: DocumentSubscriptions;

    public get subscriptions(): DocumentSubscriptions {
        return this._subscriptions;
    }

    private _lastRaftIndexPerDatabase: Map<string, number> = CaseInsensitiveKeysMap.create();

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

    public abstract getRequestExecutor(databaseName?: string): RequestExecutor;

    // TBD public IDisposable AggressivelyCache(string database = null)

    protected _eventHandlers: Array<[string, (eventArgs: any) => void]> = [];

    public addSessionListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;
    public addSessionListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: SessionAfterSaveChangesEventArgs) => void): this;
    public addSessionListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: SessionBeforeQueryEventArgs) => void): this;
    public addSessionListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: SessionBeforeDeleteEventArgs) => void): this;
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

    protected _registerEvents(session: DocumentSession): void {
        this._eventHandlers.forEach(([eventName, eventHandler]) => {
            session.on(eventName, eventHandler);
        });
    }

    public abstract maintenance: MaintenanceOperationExecutor;

    public abstract operations: OperationExecutor;

    protected _assertValidConfiguration(): void {
        this.conventions.validate();
    }
}
