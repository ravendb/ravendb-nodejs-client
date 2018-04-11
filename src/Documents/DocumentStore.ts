import * as BluebirdPromise from "bluebird";

import { throwError } from "../Exceptions";
import { RequestExecutor } from "../Http/RequestExecutor";
import { Todo } from "../Types";
import { getLogger } from "../Utility/LogUtil";
import { DocumentStoreBase } from "./DocumentStoreBase";
import { IDocumentStore } from "./IDocumentStore";
import { MaintenanceOperationExecutor } from "./Operations/MaintenanceOperationExecutor";
import { OperationExecutor } from "./Operations/OperationExecutor";

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

    private _multiDbHiLo: Todo; // MultiDatabaseHiLoIdGenerator 

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

        if (this._multiDbHiLo) {
          BluebirdPromise.resolve()
            // .then(() => this._multiDbHiLo.returnUnusedRange())
            .catch(err => this._log.warn("Error returning unused ID range.", err));
        }

        // TBD: Subscriptions?.Dispose();

        this._disposed = true;

        new BluebirdPromise((resolve, reject) => {
            let listenersExecCallbacksCount = 0;
            const listenersCount = this.listenerCount("afterDispose");
            this.emit("afterDispose", () => {
                if (listenersCount === ++listenersExecCallbacksCount) {
                    resolve();
                }
            });

        })
        .timeout(5000) 
        .catch((err) => this._log.warn(`Error handling 'afterDispose'`, err))
        .finally(() => {
            this._requestExecutors.forEach((executor, db) => {
                executor.dispose();
            });

            this.emit("executorsDisposed");
        });
    }

    // /**
    //  * Opens the session.
    //  */
    // @Override
    // public IDocumentSession openSession() {
    //     return openSession(new SessionOptions());
    // }

    // /**
    //  * Opens the session for a particular database
    //  */
    // @Override
    // public IDocumentSession openSession(String database) {
    //     SessionOptions sessionOptions = new SessionOptions();
    //     sessionOptions.setDatabase(database);

    //     return openSession(sessionOptions);
    // }

    // @Override
    // public IDocumentSession openSession(SessionOptions options) {
    //     assertInitialized();
    //     ensureNotClosed();

    //     UUID sessionId = UUID.randomUUID();
    //     String databaseName = ObjectUtils.firstNonNull(options.getDatabase(), getDatabase());
    //     RequestExecutor requestExecutor = ObjectUtils.firstNonNull(options.getRequestExecutor(), getRequestExecutor(databaseName));

    //     DocumentSession session = new DocumentSession(databaseName, this, sessionId, requestExecutor);
    //     registerEvents(session);
    //     // AfterSessionCreated(session);
    //     return session;
    //}

    public getRequestExecutor(database?: string): RequestExecutor {
        this._assertInitialized();

        if (!database) {
            database = this.database;
        }

        let executor = this._requestExecutors.get(database.toLowerCase());
        if (executor) {
            return executor;
        }

        if (!this.conventions.isDisableTopologyUpdates) {
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

        this._requestExecutors.set(database.toLowerCase(), executor);

        return executor;
    }

    /**
     * Initializes this instance.
     */
    public initialize(): IDocumentStore {
        if (this._initialized) {
            return this;
        }

        this.assertValidConfiguration();

        try {
            if (!this.conventions.documentIdGenerator) { // don't overwrite what the user is doing
                const generator = null as Todo as any; // new MultiDatabaseHiLoIdGenerator(this, this.conventions)
                this._multiDbHiLo = generator;

                //this.conventions.documentIdGenerator = generator.generateDocumentId.bind(generator);
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
    protected assertValidConfiguration(): void {
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
    public withAggressiveCachingDisabled(
        action: () => void | PromiseLike<any>, databaseName?: string): PromiseLike<any> {
        this._assertInitialized();
        const re: RequestExecutor = this.getRequestExecutor(databaseName || this.database);
        const old = re.agressiveCaching;
        re.agressiveCaching = null;

        return BluebirdPromise.resolve()
            .then(() => action())
            .finally(() => re.agressiveCaching = old);
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

// export class DocumentStore extends DocumentStoreBase implements IDocumentStore {
//   public identifier: string;
//   private _initialized: boolean;
//   private _urls: string[];
//   private _database: string;
//   private _generator: IHiloIdGenerator;
//   private _conventions: DocumentConventions;
//   private _requestExecutors: Map<boolean, Map<string, RequestExecutor>>;
//   private _operations: OperationExecutor;
//   private _maintenance: AdminOperationExecutor;
//   private _authOptions: IStoreAuthOptions;

//   public get database(): string {
//     return this._database;
//   }

//   public get urls(): string[] {
//     return this._urls;
//   }

//   public get singleNodeUrl(): string {
//     return _.first(this._urls);
//   }

//   public get authOptions(): IStoreAuthOptions {
//     return this._authOptions;
//   }

//   public get operations(): OperationExecutor {
//     if (!this._operations) {
//       this._operations = new OperationExecutor(this, this._database);
//     }

//     return this._operations;
//   }

//   public get maintenance(): AdminOperationExecutor {
//     if (!this._maintenance) {
//       this._maintenance = new AdminOperationExecutor(this, this._database);
//     }

//     return this._maintenance;
//   }

//   public getRequestExecutor(database?: string): RequestExecutor {
//     const dbName = database || this._database;
//     const forSingleNode: boolean = this.conventions.disableTopologyUpdates;
//     const executors: Map<boolean, Map<string, RequestExecutor>> = this._requestExecutors;
//     let executorsByDB: Map<string, RequestExecutor>;

//     if (!(executorsByDB = executors.get(forSingleNode))) {
//       executors.set(forSingleNode, executorsByDB = new Map<string, RequestExecutor>());
//     }

//     if (!executorsByDB.has(dbName)) {
//       executorsByDB.set(dbName, this.createRequestExecutor(dbName, forSingleNode));
//     }

//     return executorsByDB.get(dbName);
//   }

//   public get conventions(): DocumentConventions {
//     if (!this._conventions) {
//       this._conventions = new DocumentConventions();
//     }

//     return this._conventions;
//   }

//   constructor(urlOrUrls: string | string[], defaultDatabase: string, authOptions?: IStoreAuthOptions) {
//     super();
//     this._database = defaultDatabase;
//     this._initialized = false;
//     this._urls = UriUtility.parseUrls(urlOrUrls);
//     this._requestExecutors = new Map<boolean, Map<string, RequestExecutor>>();
//     this._authOptions = authOptions || null;
//   }

//   static create(urlOrUrls: string | string[], defaultDatabase: string, authOptions?: IStoreAuthOptions): IDocumentStore {
//     return new DocumentStore(urlOrUrls, defaultDatabase, authOptions);
//   }

//   public initialize(): IDocumentStore {
//     if (!this._initialized) {
//       if ((this._urls.some((url: string): boolean =>
//         UriUtility.isSecure(url))) && !this._authOptions) {
//         throw new NotSupportedException("Access to secured servers require `authOptions` to be specified");
//       }

//       if (!this._database) {
//         throw new InvalidOperationException("Default database isn"t set.");
//       }

//       this._generator = new HiloMultiDatabaseIdGenerator(this);
//     }

//     this._initialized = true;
//     return this;
//   }

//   public async dispose(): Promise<IDocumentStore> {
//     this.removeAllListeners();
//     return this._generator.returnUnusedRange()
//       .catch((): BluebirdPromise<void> => BluebirdPromise.resolve())
//       .then((): IDocumentStore => {
//         this.maintenance.server.dispose();

//         for (let executorsByDB of this._requestExecutors.values()) {
//           for (let executor of executorsByDB.values()) {
//             executor.dispose();
//           }
//         }

//         return this;
//       });
//   }

//   public openSession(database?: string): IDocumentSession;
//   public openSession(options?: ISessionOptions): IDocumentSession;
//   public openSession(database?: string, options?: ISessionOptions): IDocumentSession;
//   public openSession(databaseOrOptions?: string | ISessionOptions, options?: ISessionOptions): IDocumentSession {
//     this.assertInitialize();
//     let database: string = <string>databaseOrOptions;
//     let sessionOptions: ISessionOptions = <ISessionOptions>(options || {});

//     if (TypeUtil.isObject(databaseOrOptions)) {
//       sessionOptions = <ISessionOptions>databaseOrOptions;
//       database = sessionOptions.database;
//     }

//     let dbName: string = database || this._database;
//     let executor: RequestExecutor = sessionOptions.requestExecutor;

//     if (!executor || (executor.initialDatabase !== dbName)) {
//       executor = this.getRequestExecutor(dbName);
//     }

//     return new DocumentSession(dbName, this, uuid(), executor);
//   }

//   public async generateId(document: object, documentType?: DocumentType, database?: string, callback?: EntityIdCallback): Promise<string> {
//     if (TypeUtil.isFunction(documentType)) {
//       documentType = (<DocumentConstructor>documentType).name;
//     }

//     if (!documentType) {
//       const autoGenerated: string = uuid();

//       PromiseResolver.resolve<string>(autoGenerated, null, callback);
//       return Promise.resolve<string>(autoGenerated);
//     }

//     return this._generator.generateDocumentId(document, documentType, database)
//       .then((id: string) => {
//         PromiseResolver.resolve<string>(id, null, callback);
//         return id;
//       })
//       .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
//   }

//   protected assertInitialize(): void {
//     if (!this._initialized) {
//       throw new InvalidOperationException("You cannot open a session or access the _database commands\
//  before initializing the document store. Did you forget calling initialize() ?"
//       );
//     }
//   }

//   protected createRequestExecutor(database?: string, forSingleNode?: boolean): RequestExecutor {
//     const dbName: string = database || this._database;
//     const authOptions = <IRequestAuthOptions>this._authOptions;

//     const executor: IRequestExecutor = (true === forSingleNode)
//       ? RequestExecutor.createForSingleNode(this.singleNodeUrl, dbName, authOptions)
//       : RequestExecutor.create(this.urls, dbName, authOptions);

//     return <RequestExecutor>executor;
//   }
// }
