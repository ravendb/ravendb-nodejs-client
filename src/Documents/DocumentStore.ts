import { v4 as uuidv4 } from "uuid";
import * as BluebirdPromise from "bluebird";

import { throwError } from "../Exceptions";
import { RequestExecutor } from "../Http/RequestExecutor";
import { getLogger } from "../Utility/LogUtil";
import { DocumentStoreBase } from "./DocumentStoreBase";
import { IDocumentStore } from "./IDocumentStore";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor";
import { OperationExecutor } from "./Operations/OperationExecutor";
import { IDocumentSession } from "./Session/IDocumentSession";
import { SessionOptions } from "./Session/SessionOptions";
import { DocumentSession } from "./Session/DocumentSession";
import { IAuthOptions } from "../Auth/AuthOptions";
import { BulkInsertOperation } from "./BulkInsertOperation";
import { IDatabaseChanges } from "./Changes/IDatabaseChanges";
import { DatabaseChanges } from "./Changes/DatabaseChanges";
import { DatabaseSmuggler } from "./Smuggler/DatabaseSmuggler";
import { DatabaseChangesOptions } from "./Changes/DatabaseChangesOptions";
import { IDisposable } from "../Types/Contracts";
import { MultiDatabaseHiLoIdGenerator } from "./Identity/MultiDatabaseHiLoIdGenerator";

const log = getLogger({ module: "DocumentStore" });

export class DocumentStore extends DocumentStoreBase {

    private _log =
        getLogger({ module: "DocumentStore-" + Math.floor(Math.random() * 1000) });

    private readonly _databaseChanges: Map<string, IDatabaseChanges> = new Map(); //TODO: check usage - it has compound key!
    // TBD: private ConcurrentDictionary<string, Lazy<EvictItemsFromCacheBasedOnChanges>> _aggressiveCacheChanges =
    // new ConcurrentDictionary<string, Lazy<EvictItemsFromCacheBasedOnChanges>>();
    // TBD: private readonly ConcurrentDictionary<string, EvictItemsFromCacheBasedOnChanges> 
    // _observeChangesAndEvictItemsFromCacheForDatabases = 
    // new ConcurrentDictionary<string, EvictItemsFromCacheBasedOnChanges>();

    private _requestExecutors: Map<string, RequestExecutor> = new Map();

    private _multiDbHiLo: MultiDatabaseHiLoIdGenerator;

    private _maintenanceOperationExecutor: MaintenanceOperationExecutor;
    private _operationExecutor: OperationExecutor;
    private _smuggler: DatabaseSmuggler;

    private _identifier: string;
    private _aggressiveCachingUsed: boolean;

    public constructor(url: string, database: string);
    public constructor(urls: string[], database: string);
    public constructor(url: string, database: string, authOptions: IAuthOptions);
    public constructor(urls: string[], database: string, authOptions: IAuthOptions);
    public constructor(urls: string | string[], database: string, authOptions?: IAuthOptions) {
        super();

        this._database = database;
        this.authOptions = authOptions;
        this.urls = Array.isArray(urls)
            ? urls as string[]
            : [urls];
    }

    private _getDatabaseChangesCacheKey(options: DatabaseChangesOptions) {
        return options.databaseName.toLowerCase() + "/" + (options.nodeTag || "<null>");
    }

    public get identifier(): string {
        if (this._identifier) {
            return this._identifier;
        }

        if (!this._urls) {
            return null;
        }

        const urlsString = this._urls.join(", ");
        if (this._database) {
            return `${ urlsString } DB: ${this._database}`;
        }

        return urlsString;
    }

    public set identifier(identifier: string) {
        this._identifier = identifier;
    }

    /**
     * Disposes the document store
     */
    public dispose(): void {
        this._log.info("Dispose.");
        this.emit("beforeDispose");

        /* TBD
            foreach (var value in _aggressiveCacheChanges.Values)
            {
                if (value.IsValueCreated == false)
                    continue;

                value.Value.Dispose();
            }*/
        this._databaseChanges.forEach(change => change.dispose());

        /* TODO
            // try to wait until all the async disposables are completed
            Task.WaitAll(tasks.ToArray(), TimeSpan.FromSeconds(3));
            // if this is still going, we continue with disposal, it is for graceful shutdown only, anyway
        */

        const disposeChain = BluebirdPromise.resolve();

        disposeChain
            .then(() => {
                if (this._multiDbHiLo) {
                    return Promise.resolve()
                        .then(() => this._multiDbHiLo.returnUnusedRange())
                        .catch(err => this._log.warn("Error returning unused ID range.", err));
                }
            })
            .then(() => {
                this._disposed = true;
                this.subscriptions.dispose();

                return new BluebirdPromise((resolve, reject) => {
                    let listenersExecCallbacksCount = 0;
                    const listenersCount = this.listenerCount("afterDispose");
                    if (listenersCount === 0) {
                        resolve();
                    } else {
                        this.emit("afterDispose", () => {
                            if (listenersCount === ++listenersExecCallbacksCount) {
                                resolve();
                            }
                        });
                    }
                })
                .timeout(5000)
                .catch((err) => this._log.warn(`Error handling 'afterDispose'`, err));
            })
            .then(() => {
                this._log.info(`Disposing request executors ${this._requestExecutors.size}`);
                this._requestExecutors.forEach((executor, db) => {
                    try {
                        executor.dispose();
                    } catch (err) {
                        this._log.warn(err, `Error disposing request executor.`);
                    }
                });
            })
            .finally(() => this.emit("executorsDisposed"));
    }

    /**
     * Opens document session.
     */
    public openSession(): IDocumentSession;
    /**
     * Opens document session.
     */
    public openSession(database: string): IDocumentSession;
    /**
     * Opens document session
     */
    public openSession(sessionOpts: SessionOptions): IDocumentSession;
    /**
     * Opens document session
     */
    public openSession(databaseOrSessionOptions?: string | SessionOptions): IDocumentSession {
        this.assertInitialized();
        this._ensureNotDisposed();

        if (typeof(databaseOrSessionOptions) === "string") {
            return this.openSession({ database: databaseOrSessionOptions as string });
        }

        databaseOrSessionOptions = databaseOrSessionOptions || {} as any;
        const sessionOpts = databaseOrSessionOptions as SessionOptions;

        const sessionId = uuidv4();
        const session = new DocumentSession(this, sessionId, sessionOpts);
        this.registerEvents(session);
        this.emit("sessionCreated", { session });
        return session;
    }

    /**
     * Gets request executor for specific database. Default is initial database.
     */
    public getRequestExecutor(database?: string): RequestExecutor {
        this.assertInitialized();

        database = this.getEffectiveDatabase(database);

        const databaseLower = database.toLowerCase();

        let executor = this._requestExecutors.get(databaseLower);
        if (executor) {
            return executor;
        }

        const createRequestExecutor = () => {
            const requestExecutor = RequestExecutor.create(this.urls, database, {
                authOptions: this.authOptions,
                documentConventions: this.conventions
            });
            this.registerEvents(requestExecutor);

            return requestExecutor;
        }

        const createRequestExecutorForSingleNode = () => {
            const forSingleNode = RequestExecutor.createForSingleNodeWithConfigurationUpdates(
                this.urls[0], database, {
                    authOptions: this.authOptions,
                    documentConventions: this.conventions
                });

            this.registerEvents(forSingleNode);

            return forSingleNode;
        }

        if (!this.conventions.disableTopologyUpdates) {
            executor = createRequestExecutor();
        } else {
            executor = createRequestExecutorForSingleNode();
        }

        this._log.info(`New request executor for database ${database}`);
        this._requestExecutors.set(databaseLower, executor);

        return executor;
    }

    requestTimeout(timeoutInMs: number): IDisposable;
    requestTimeout(timeoutInMs: number, database: string): IDisposable;
    requestTimeout(timeoutInMs: number, database?: string): IDisposable {
        this.assertInitialized();

        database = this.getEffectiveDatabase(database);

        if (!database) {
            throwError("InvalidOperationException", "Cannot use requestTimeout without a default database defined " +
                "unless 'database' parameter is provided. Did you forget to pass 'database' parameter?");
        }

        const requestExecutor = this.getRequestExecutor(database)
        const oldTimeout = requestExecutor.defaultTimeout;

        requestExecutor.defaultTimeout = timeoutInMs;

        return {
            dispose: () => requestExecutor.defaultTimeout = oldTimeout
        };
    }

    /**
     * Initializes this instance.
     */
    public initialize(): IDocumentStore {
        if (this._initialized) {
            return this;
        }

        this._assertValidConfiguration();

        RequestExecutor.validateUrls(this.urls, this.authOptions);

        try {
            if (!this.conventions.documentIdGenerator) { // don't overwrite what the user is doing
                const generator = new MultiDatabaseHiLoIdGenerator(this);
                this._multiDbHiLo = generator;

                this.conventions.documentIdGenerator =
                    (dbName: string, entity: object) => generator.generateDocumentId(dbName, entity);
            }

            this.conventions.freeze();
            this._initialized = true;
        } catch (e) {
            this.dispose();
            throw e;
        }

        return this;
    }

    /**
     * Validate the configuration for the document store
     */
    protected _assertValidConfiguration(): void {
        if (!this._urls || !this._urls.length) {
            throwError("InvalidArgumentException", "Document store URLs cannot be empty");
        }

        super._assertValidConfiguration();
    }

    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     */
    /* TBD 4.1
    public disableAggressiveCaching(): IDisposable;
    */

    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     */

    /* TBD 4.1
    public disableAggressiveCaching(): IDisposable;
    public disableAggressiveCaching(database: string): IDisposable;
    public disableAggressiveCaching(database?: string): IDisposable {
        this.assertInitialized();
        const re: RequestExecutor = this.getRequestExecutor(database || this.database);
        const old = re.aggressiveCaching;
        re.aggressiveCaching = null;
        const dispose = () => re.aggressiveCaching = old;

        return { dispose };
    }
     */

    public changes(): IDatabaseChanges;
    public changes(database: string): IDatabaseChanges;
    public changes(database: string, nodeTag: string): IDatabaseChanges;
    public changes(database?: string, nodeTag?: string): IDatabaseChanges {
        this.assertInitialized();

        const changesOptions: DatabaseChangesOptions = {
            databaseName: database || this.database,
            nodeTag
        };
        const cacheKey = this._getDatabaseChangesCacheKey(changesOptions);
        if (this._databaseChanges.has(cacheKey)) {
            return this._databaseChanges.get(cacheKey);
        }

        const newChanges = this._createDatabaseChanges(changesOptions);
        this._databaseChanges.set(cacheKey, newChanges);
        return newChanges;
    }

    protected _createDatabaseChanges(node: DatabaseChangesOptions) {
        return new DatabaseChanges(this.getRequestExecutor(node.databaseName), node.databaseName,
            () => this._databaseChanges.delete(this._getDatabaseChangesCacheKey(node)), node.nodeTag);
    }

    public getLastDatabaseChangesStateException(): Error;
    public getLastDatabaseChangesStateException(database: string): Error;
    public getLastDatabaseChangesStateException(database: string, nodeTag: string): Error;
    public getLastDatabaseChangesStateException(database?: string, nodeTag?: string): Error {
        const node: DatabaseChangesOptions = {
            databaseName: database || this.database,
            nodeTag
        };
        const cacheKey = this._getDatabaseChangesCacheKey(node);
        const databaseChanges = this._databaseChanges.get(cacheKey) as DatabaseChanges;
        if (databaseChanges) {
            return databaseChanges.lastConnectionStateException;
        }

        return null;
    }

    // TBD public override IDatabaseChanges Changes(string database = null)
    // TBD protected virtual IDatabaseChanges CreateDatabaseChanges(string database)
    // TBD public override IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null)
    // TBD private void ListenToChangesAndUpdateTheCache(string database)

    /**
     * Gets maintenance operations executor.
     */
    public get maintenance(): MaintenanceOperationExecutor {
        this.assertInitialized();

        if (!this._maintenanceOperationExecutor) {
            this._maintenanceOperationExecutor = new MaintenanceOperationExecutor(this);
        }

        return this._maintenanceOperationExecutor;
    }

    public get smuggler(): DatabaseSmuggler {
        if (!this._smuggler) {
            this._smuggler = new DatabaseSmuggler(this);
        }

        return this._smuggler;
    }

    /**
     * Gets operations executor.
     */
    public get operations(): OperationExecutor {
        if (!this._operationExecutor) {
            this._operationExecutor = new OperationExecutor(this);
        }

        return this._operationExecutor;
    }

    public bulkInsert(): BulkInsertOperation;
    public bulkInsert(database: string): BulkInsertOperation;
    public bulkInsert(database?: string): BulkInsertOperation {
        this.assertInitialized();

        return new BulkInsertOperation(this.getEffectiveDatabase(database), this);
    }
}
