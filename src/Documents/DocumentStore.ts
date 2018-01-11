import * as uuid from 'uuid';
import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird';
import {IDocumentStore} from './IDocumentStore';
import {IDocumentSession, ISessionOptions} from "./Session/IDocumentSession";
import {DocumentSession} from "./Session/DocumentSession";
import {RequestExecutor, IRequestExecutor} from '../Http/Request/RequestExecutor';
import {EntityIdCallback} from '../Typedef/Callbacks';
import {DocumentConventions, DocumentConstructor, DocumentType} from './Conventions/DocumentConventions';
import {InvalidOperationException, RavenException, NotSupportedException} from '../Database/DatabaseExceptions';
import {IHiloIdGenerator} from '../Hilo/IHiloIdGenerator';
import {HiloMultiDatabaseIdGenerator} from '../Hilo/HiloMultiDatabaseIdGenerator';
import {PromiseResolver} from "../Utility/PromiseResolver";
import {TypeUtil} from "../Utility/TypeUtil";
import {UriUtility} from "../Http/UriUtility";
import {OperationExecutor, AdminOperationExecutor} from '../Database/Operations/OperationExecutor';
import {IStoreAuthOptions, IRequestAuthOptions} from '../Auth/AuthOptions';

export class DocumentStore implements IDocumentStore {
  private _initialized: boolean;
  private _urls: string[];  
  private _database: string;
  private _generator: IHiloIdGenerator;
  private _conventions: DocumentConventions;
  private _requestExecutors: Map<boolean, Map<string, RequestExecutor>>;
  private _operations: OperationExecutor;
  private _maintenance: AdminOperationExecutor;
  private _authOptions: IStoreAuthOptions;

  public get database(): string {
    return this._database;
  }

  public get urls(): string[] {
    return this._urls;
  }

  public get singleNodeUrl(): string {
    return _.first(this._urls);
  }

  public get authOptions(): IStoreAuthOptions {
    return this._authOptions;
  }

  public get operations(): OperationExecutor {
    if (!this._operations) {
      this._operations = new OperationExecutor(this, this._database);
    }

    return this._operations;
  }

  public get maintenance(): AdminOperationExecutor {
    if (!this._maintenance) {
      this._maintenance = new AdminOperationExecutor(this, this._database);      
    }

    return this._maintenance;
  }

  public getRequestExecutor(database?: string): RequestExecutor {
    const dbName = database || this._database;
    const forSingleNode: boolean = this.conventions.disableTopologyUpdates;
    const executors: Map<boolean, Map<string, RequestExecutor>> = this._requestExecutors;
    let executorsByDB: Map<string, RequestExecutor>;

    if (!(executorsByDB = executors.get(forSingleNode))) {
      executors.set(forSingleNode, executorsByDB = new Map<string, RequestExecutor>());
    }

    if (!executorsByDB.has(dbName)) {
      executorsByDB.set(dbName, this.createRequestExecutor(dbName, forSingleNode));
    }

    return executorsByDB.get(dbName);
  }

  public get conventions(): DocumentConventions {
    if (!this._conventions) {
      this._conventions = new DocumentConventions();
    }

    return this._conventions;
  }

  constructor(urlOrUrls: string | string[], defaultDatabase: string, authOptions?: IStoreAuthOptions) {
    this._database = defaultDatabase;
    this._initialized = false;
    this._urls = UriUtility.parseUrls(urlOrUrls);
    this._requestExecutors = new Map<boolean, Map<string, RequestExecutor>>();
    this._authOptions = authOptions || null;
  }
 
  static create(urlOrUrls: string | string[], defaultDatabase: string, authOptions?: IStoreAuthOptions): IDocumentStore {
    return new DocumentStore(urlOrUrls, defaultDatabase, authOptions);
  }

  public initialize(): IDocumentStore {
    if (!this._initialized) {
      if ((this._urls.some((url: string): boolean => 
      UriUtility.isSecure(url))) && !this._authOptions) {
        throw new NotSupportedException("Access to secured servers require `authOptions` to be specified");
      }

      if (!this._database) {
        throw new InvalidOperationException("Default database isn't set.");
      }

      this._generator = new HiloMultiDatabaseIdGenerator(this);
    }

    this._initialized = true;
    return this;
  }

  public async dispose(): Promise<IDocumentStore> {
    return this._generator.returnUnusedRange()
      .catch((): BluebirdPromise<void> => BluebirdPromise.resolve())
      .then((): IDocumentStore => {
        this.maintenance.server.dispose();

        for (let executorsByDB of this._requestExecutors.values()) {
          for (let executor of executorsByDB.values()) {
            executor.dispose();
          }
        }

        return this;
      });
  }

  public openSession(database?: string) : IDocumentSession;
  public openSession(options?: ISessionOptions) : IDocumentSession;
  public openSession(database?: string, options?: ISessionOptions) : IDocumentSession;
  public openSession(databaseOrOptions?: string | ISessionOptions, options?: ISessionOptions) : IDocumentSession {
    this.assertInitialize();
    let database: string = <string>databaseOrOptions;
    let sessionOptions: ISessionOptions = <ISessionOptions>(options || {});

    if (TypeUtil.isObject(databaseOrOptions)) {
      sessionOptions = <ISessionOptions>databaseOrOptions;
      database = sessionOptions.database;
    }

    let dbName: string = database || this._database;
    let executor: RequestExecutor = sessionOptions.requestExecutor;
    
    if (!executor || (executor.initialDatabase !== dbName)) {
      executor = this.getRequestExecutor(dbName);
    }
    
    return new DocumentSession(dbName, this, uuid(),  executor);
  }

  public async generateId(document: object, documentType?: DocumentType, database?: string, callback?: EntityIdCallback): Promise<string> {
    if (TypeUtil.isFunction(documentType)) {
      documentType = (<DocumentConstructor>documentType).name;
    }

    if (!documentType) {
      const autoGenerated: string = uuid();

      PromiseResolver.resolve<string>(autoGenerated, null, callback);
      return Promise.resolve<string>(autoGenerated);
    }

    return this._generator.generateDocumentId(document, documentType, database)
      .then((id: string) => {
        PromiseResolver.resolve<string>(id, null, callback);
        return id;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  protected assertInitialize(): void {
    if (!this._initialized) {
      throw new InvalidOperationException("You cannot open a session or access the _database commands\
 before initializing the document store. Did you forget calling initialize() ?"
      );
    }
  }

  protected createRequestExecutor(database?: string, forSingleNode?: boolean): RequestExecutor {    
    const dbName: string = database || this._database;
    const authOptions = <IRequestAuthOptions>this._authOptions;

    const executor: IRequestExecutor = (true === forSingleNode)
      ? RequestExecutor.createForSingleNode(this.singleNodeUrl, dbName, authOptions)
      : RequestExecutor.create(this.urls, dbName, authOptions);
    
    return <RequestExecutor>executor;
  }
}
