import * as uuid from "uuid";
import * as BluebirdPromise from "bluebird";

import { throwError } from "../Exceptions";
import { RequestExecutor } from "../Http/RequestExecutor";
import { Todo } from "../Types";
import { getLogger } from "../Utility/LogUtil";
import { DocumentStoreBase } from "./DocumentStoreBase";
import { IDocumentStore } from "./IDocumentStore";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor";
import { OperationExecutor } from "./Operations/OperationExecutor";
import { IDocumentSession, ISessionOptions } from "./Session/IDocumentSession";
import { DocumentSession } from "./Session/DocumentSession";
import {HiloMultiDatabaseIdGenerator} from "./Identity/HiloMultiDatabaseIdGenerator";
import { AbstractIndexCreationTask } from "./Indexes";
import { IDisposable } from "../Types/Contracts";

// import { IDocumentSession, ISessionOptions } from "./Session/IDocumentSession";
// import { DocumentSession } from "./Session/DocumentSession";
const log = getLogger({ module: "DocumentStore" });

export class DocumentStore extends DocumentStoreBase {

    private _log = 
        getLogger({ module: "DocumentStore-" + Math.floor(Math.random() * 1000) });

    // TBD:private readonly AtomicDictionary<IDatabaseChanges> _databaseChanges = 
    // new AtomicDictionary<IDatabaseChanges>(StringComparer.OrdinalIgnoreCase);
    // TBD: private ConcurrentDictionary<string, Lazy<EvictItemsFromCacheBasedOnChanges>> _aggressiveCacheChanges = 
    // new ConcurrentDictionary<string, Lazy<EvictItemsFromCacheBasedOnChanges>>();
    // TBD: private readonly ConcurrentDictionary<string, EvictItemsFromCacheBasedOnChanges> 
    // _observeChangesAndEvictItemsFromCacheForDatabases = 
    // new ConcurrentDictionary<string, EvictItemsFromCacheBasedOnChanges>();

    private _requestExecutors: Map<string, RequestExecutor> = new Map(); 

    private _multiDbHiLo: HiloMultiDatabaseIdGenerator; // MultiDatabaseHiLoIdGenerator 

    private _maintenanceOperationExecutor: MaintenanceOperationExecutor; // MaintenanceOperationExecutor ;
    private _operationExecutor: OperationExecutor;

    private _identifier: string;
    private _aggressiveCachingUsed: boolean;
    
    public constructor(url: string, database: string);
    public constructor(urls: string[], database: string);
    public constructor(urls: string | string[], database: string) {
        super();

        this._database = database;
        this.urls = Array.isArray(urls) 
          ? urls as string[] 
          : [ urls ];
    }

    public get identifier(): string {
        if (!this._identifier) {
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
        this.identifier = identifier;
    }

    public dispose(): void {
        this._log.info("Dispose.");
        this.emit("beforeDispose");

        /* TBD
            foreach (var observeChangesAndEvictItemsFromCacheForDatabase 
              in _observeChangesAndEvictItemsFromCacheForDatabases)
                observeChangesAndEvictItemsFromCacheForDatabase.Value.Dispose();

            var tasks = new List<Task>();
            foreach (var changes in _databaseChanges)
            {
                using (changes.Value)
                { }
            }

            // try to wait until all the async disposables are completed
            Task.WaitAll(tasks.ToArray(), TimeSpan.FromSeconds(3));
            // if this is still going, we continue with disposal, it is for graceful shutdown only, anyway
        */

        const disposeChain = BluebirdPromise.resolve();

        disposeChain
            .then(() => {
                if (this._multiDbHiLo) {
                    return BluebirdPromise.resolve()
                        .then(() => this._multiDbHiLo.returnUnusedRange())
                        .catch(err => this._log.warn("Error returning unused ID range.", err));
                }
            })
            .then(() => {
                this._disposed = true;
                // TBD: Subscriptions?.Dispose();

                return new BluebirdPromise((resolve, reject) => {
                    let listenersExecCallbacksCount = 0;
                    const listenersCount = this.listenerCount("afterDispose");
                    this.emit("afterDispose", () => {
                        if (listenersCount === ++listenersExecCallbacksCount) {
                            resolve();
                        }
                    });

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

    public openSession(): IDocumentSession;
    public openSession(database: string): IDocumentSession;
    public openSession(sessionOpts: ISessionOptions): IDocumentSession;
    public openSession(databaseOrSessionOptions?: string | ISessionOptions): IDocumentSession  {
        this._assertInitialized();
        this._ensureNotDisposed();

        if (typeof(databaseOrSessionOptions) === "string") {
            return this.openSession({ 
                database: (databaseOrSessionOptions as string) 
            });
        }

        let database: string;
        let sessionOpts: ISessionOptions;
        let requestExecutor: RequestExecutor;
        databaseOrSessionOptions = databaseOrSessionOptions || {};
        database = databaseOrSessionOptions.database || this._database;
        sessionOpts = databaseOrSessionOptions as ISessionOptions;
        requestExecutor = sessionOpts.requestExecutor || this.getRequestExecutor(database);

        const sessionId = uuid();
        const session = new DocumentSession(database, this, sessionId, requestExecutor);
        this._registerEvents(session);
        // AfterSessionCreated(session);
        return session;
    }

    public getRequestExecutor(database?: string): RequestExecutor {
        this._assertInitialized();

        if (!database) {
            database = this.database;
        }

        const databaseLower = database.toLowerCase();

        let executor = this._requestExecutors.get(databaseLower);
        if (executor) {
            return executor;
        }

        if (!this.conventions.disableTopologyUpdates) {
            executor = RequestExecutor.create(this.urls, this.database, { 
                authOptions: this.authOptions, 
                documentConventions: this.conventions
            });
        } else {
            executor = RequestExecutor.createForSingleNodeWithConfigurationUpdates(
              this.urls[0], this.database, { 
                  authOptions: this.authOptions, 
                  documentConventions: this.conventions
              });
        }

        this._log.info(`New request executor for datebase ${database}`);
        this._requestExecutors.set(databaseLower, executor);

        return executor;
    }

    /**
     * Initializes this instance.
     */
    public initialize(): IDocumentStore {
        if (this._initialized) {
            return this;
        }

        this._assertValidConfiguration();

        try {
            if (!this.conventions.documentIdGenerator) { // don't overwrite what the user is doing
                const generator = new HiloMultiDatabaseIdGenerator(this);
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
    }

    /**
     * Setup the context for no aggressive caching
     *
     * This is mainly useful for internal use inside RavenDB, when we are executing
     * queries that have been marked with WaitForNonStaleResults, we temporarily disable
     * aggressive caching.
     */
    public disableAggressiveCaching(): IDisposable;
    public disableAggressiveCaching(database: string): IDisposable;
    public disableAggressiveCaching(database?: string): IDisposable {
        this._assertInitialized();
        const re: RequestExecutor = this.getRequestExecutor(database || this.database);
        const old = re.agressiveCaching;
        re.agressiveCaching = null;
        const dispose = () => re.agressiveCaching = old;

        return { dispose };
    }

    // TBD public override IDatabaseChanges Changes(string database = null)
    // TBD protected virtual IDatabaseChanges CreateDatabaseChanges(string database)
    // TBD public override IDisposable AggressivelyCacheFor(TimeSpan cacheDuration, string database = null)
    // TBD private void ListenToChangesAndUpdateTheCache(string database)

    public get maintenance(): MaintenanceOperationExecutor {
        this._assertInitialized();

        if (!this._maintenanceOperationExecutor) {
            this._maintenanceOperationExecutor = new MaintenanceOperationExecutor(this);
        }

        return this._maintenanceOperationExecutor;
    }

    public get operations(): OperationExecutor {
        if (!this._operationExecutor) {
            this._operationExecutor = new OperationExecutor(this);
        }

        return this._operationExecutor;
    }

    // TBD public override BulkInsertOperation BulkInsert(string database = null)
}
