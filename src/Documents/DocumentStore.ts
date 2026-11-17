
import { randomUUID } from "node:crypto";
import { throwError } from "../Exceptions/index.js";
import { RequestExecutor } from "../Http/RequestExecutor.js";
import { getLogger } from "../Utility/LogUtil.js";
import { DocumentStoreBase } from "./DocumentStoreBase.js";
import { IDocumentStore } from "./IDocumentStore.js";
import { AggressivelyCacheForOptions } from "./IDocumentStore.js";
import { AggressiveCacheOptions } from "../Http/AggressiveCacheOptions.js";
import { EvictItemsFromCacheBasedOnChanges } from "./Changes/EvictItemsFromCacheBasedOnChanges.js";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor.js";
import { OperationExecutor } from "./Operations/OperationExecutor.js";
import { IDocumentSession } from "./Session/IDocumentSession.js";
import { SessionOptions } from "./Session/SessionOptions.js";
import { DocumentSession } from "./Session/DocumentSession.js";
import { IAuthOptions } from "../Auth/AuthOptions.js";
import { BulkInsertOperation } from "./BulkInsertOperation.js";
import { IDatabaseChanges } from "./Changes/IDatabaseChanges.js";
import { DatabaseChanges } from "./Changes/DatabaseChanges.js";
import { DatabaseSmuggler } from "./Smuggler/DatabaseSmuggler.js";
import { DatabaseChangesOptions } from "./Changes/DatabaseChangesOptions.js";
import { IDisposable } from "../Types/Contracts.js";
import { MultiDatabaseHiLoIdGenerator } from "./Identity/MultiDatabaseHiLoIdGenerator.js";
import { TypeUtil } from "../Utility/TypeUtil.js";
import { wrapWithTimeout } from "../Utility/PromiseUtil.js";
import { BulkInsertOptions } from "./BulkInsert/BulkInsertOptions.js";

const log = getLogger({ module: "DocumentStore" });

export class DocumentStore extends DocumentStoreBase {

    private _log =
        getLogger({ module: "DocumentStore-" + Math.floor(Math.random() * 1000) });

    private readonly _databaseChanges: Map<string, IDatabaseChanges> = new Map(); //TODO: check usage - it has compound key!
    private readonly _aggressiveCacheChanges: Map<string, EvictItemsFromCacheBasedOnChanges> = new Map();
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

    public get hiLoIdGenerator() {
        return this._multiDbHiLo;
    }

    /**
     * Disposes the document store
     */
    public dispose(): void {
        this._log.info("Dispose.");
        this.emit("beforeDispose");

        for (const evict of this._aggressiveCacheChanges.values()) {
            evict.dispose();
        }
        for (const change of this._databaseChanges.values()) {
            change.dispose();
        }

        /* TODO
            // try to wait until all the async disposables are completed
            Task.WaitAll(tasks.ToArray(), TimeSpan.FromSeconds(3));
            // if this is still going, we continue with disposal, it is for graceful shutdown only, anyway
        */

        const disposeChain = Promise.resolve();

        disposeChain
            .then(async () => {
                if (this._multiDbHiLo) {
                    try {
                        return await this._multiDbHiLo.returnUnusedRange();
                    } catch (err) {
                        return await this._log.warn("Error returning unused ID range.", err);
                    }
                }
            })
            .then(async () => {
                this._disposed = true;
                this.subscriptions.dispose();

                const task = new Promise<void>((resolve, reject) => {
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
                });

                try {
                    return await wrapWithTimeout(task, 5_000);
                } catch (err) {
                    return await this._log.warn(`Error handling 'afterDispose'`, err);
                }
            })
            .then(() => {
                this._log.info(`Disposing request executors ${this._requestExecutors.size}`);
                for (const [db, executor] of this._requestExecutors.entries()) {
                    try {
                        executor.dispose();
                    } catch (err) {
                        this._log.warn(err, `Error disposing request executor.`);
                    }
                }
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
        if (!databaseOrSessionOptions) {
            const sessionOptions: SessionOptions = {
                disableAtomicDocumentWritesInClusterWideTransaction: this.conventions.disableAtomicDocumentWritesInClusterWideTransaction
            };
            return this.openSession(sessionOptions);
        }

        this.assertInitialized();
        this._ensureNotDisposed();

        if (typeof(databaseOrSessionOptions) === "string") {
            return this.openSession({
                database: databaseOrSessionOptions,
                disableAtomicDocumentWritesInClusterWideTransaction: this.conventions.disableAtomicDocumentWritesInClusterWideTransaction
            });
        }

        databaseOrSessionOptions = databaseOrSessionOptions || {} as any;
        const sessionOpts = databaseOrSessionOptions as SessionOptions;

        const sessionId = randomUUID();
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
        RequestExecutor.validateCertificateRuntimeSupport(this.authOptions, this.conventions);

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

    public aggressivelyCacheFor<T>(duration: number, action: () => T | Promise<T>): Promise<T>;
    public aggressivelyCacheFor<T>(
        duration: number, options: AggressivelyCacheForOptions, action: () => T | Promise<T>): Promise<T>;
    public async aggressivelyCacheFor<T>(
        duration: number,
        optionsOrAction: AggressivelyCacheForOptions | (() => T | Promise<T>),
        action?: () => T | Promise<T>): Promise<T> {
        const options = typeof optionsOrAction === "function" ? {} : optionsOrAction ?? {};
        const effectiveAction = typeof optionsOrAction === "function" ? optionsOrAction : action;

        this.assertInitialized();
        if (!effectiveAction) {
            throwError("InvalidArgumentException", "Action cannot be null");
        }

        const database = this.getEffectiveDatabase(options.database);
        const mode = options.mode ?? this.conventions.aggressiveCache.mode;

        if (mode === "TrackChanges") {
            await this._listenToChangesAndUpdateTheCache(database);
        }

        return await this.getRequestExecutor(database)
            .withAggressiveCaching(new AggressiveCacheOptions(duration, mode), effectiveAction);
    }

    private async _listenToChangesAndUpdateTheCache(database: string): Promise<void> {
        let evict = this._aggressiveCacheChanges.get(database);
        if (!evict) {
            const created = new EvictItemsFromCacheBasedOnChanges(this.getRequestExecutor(database), database, () => {
                if (this._aggressiveCacheChanges.get(database) === created) {
                    this._aggressiveCacheChanges.delete(database);
                }
            });
            evict = created;
            this._aggressiveCacheChanges.set(database, evict);
        }

        try {
            await evict.ensureConnected();
        } catch (err) {
            evict.dispose(); // removes it from the map, so the next call connects again
            throw err;
        }
    }

    public disableAggressiveCaching<T>(action: () => T | Promise<T>): Promise<T>;
    public disableAggressiveCaching<T>(database: string, action: () => T | Promise<T>): Promise<T>;
    public async disableAggressiveCaching<T>(
        databaseOrAction: string | (() => T | Promise<T>), action?: () => T | Promise<T>): Promise<T> {
        const effectiveAction = typeof databaseOrAction === "function" ? databaseOrAction : action;

        this.assertInitialized();
        if (!effectiveAction) {
            throwError("InvalidArgumentException", "Action cannot be null");
        }

        const database = this.getEffectiveDatabase(typeof databaseOrAction === "string" ? databaseOrAction : null);

        return await this.getRequestExecutor(database).withAggressiveCaching(null, effectiveAction);
    }

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


    // TBD public override IDatabaseChanges Changes(string database = null)
    // TBD protected virtual IDatabaseChanges CreateDatabaseChanges(string database)
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
    public bulkInsert(options: BulkInsertOptions): BulkInsertOperation;
    public bulkInsert(database: string, options: BulkInsertOptions): BulkInsertOperation;
    public bulkInsert(databaseOrOptions?: string | BulkInsertOptions, optionalOptions?: BulkInsertOptions): BulkInsertOperation {
        this.assertInitialized();

        const database = TypeUtil.isString(databaseOrOptions) ? this.getEffectiveDatabase(databaseOrOptions) : this.getEffectiveDatabase(null);
        const options: BulkInsertOptions = TypeUtil.isString(databaseOrOptions) ? optionalOptions : databaseOrOptions;

        return new BulkInsertOperation(database, this, options);
    }
}
