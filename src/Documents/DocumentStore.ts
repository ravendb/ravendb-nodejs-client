import * as uuid from 'uuid';
import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird';
import {IDocumentStore} from './IDocumentStore';
import {IDocumentSession, ISessionOptions} from "./Session/IDocumentSession";
import {DocumentSession} from "./Session/DocumentSession";
import {RequestExecutor, IRequestExecutor} from '../Http/Request/RequestExecutor';
import {EntityIdCallback} from '../Typedef/Callbacks';
import {DocumentConventions, DocumentConstructor, DocumentType} from './Conventions/DocumentConventions';
import {InvalidOperationException, RavenException} from '../Database/DatabaseExceptions';
import {IHiloIdGenerator} from '../Hilo/IHiloIdGenerator';
import {HiloMultiDatabaseIdGenerator} from '../Hilo/HiloMultiDatabaseIdGenerator';
import {PromiseResolver} from "../Utility/PromiseResolver";
import {TypeUtil} from "../Utility/TypeUtil";
import {QueryString} from "../Http/QueryString";
import {OperationExecutor, AdminOperationExecutor} from '../Database/Operations/OperationExecutor';

export class DocumentStore implements IDocumentStore {
  private _initialized: boolean;
  private _apiKey?: string;
  private _urls: string[];  
  private _database: string;
  private _generator: IHiloIdGenerator;
  private _conventions: DocumentConventions;
  private _requestExecutors: Map<boolean, Map<string, RequestExecutor>>;
  private _operations: OperationExecutor;
  private _admin: AdminOperationExecutor;

  public get database(): string {
    return this._database;
  }

  public get apiKey(): string {
    return this._apiKey;
  }

  public get urls(): string[] {
    return this._urls;
  }

  public get singleNodeUrl(): string {
    return _.first(this._urls);
  }

  public get operations(): OperationExecutor {
    if (!this._operations) {
      this._operations = new OperationExecutor(this, this._database);
    }

    return this._operations;
  }

  public get admin(): AdminOperationExecutor {
    if (!this._admin) {
      this._admin = new AdminOperationExecutor(this, this._database);      
    }

    return this._admin;
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

  constructor(urlOrUrls: string | string[], defaultDatabase: string, apiKey?: string) {
    this._apiKey = apiKey;
    this._database = defaultDatabase;
    this._initialized = false;
    this._urls = QueryString.parseUrls(urlOrUrls);
    this._requestExecutors = new Map<boolean, Map<string, RequestExecutor>>();
  }

  static create(urlOrUrls: string | string[], defaultDatabase: string, apiKey?: string): IDocumentStore {
    return new DocumentStore(urlOrUrls, defaultDatabase, apiKey);
  }

  public initialize(): IDocumentStore {
    if (!this._initialized) {
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
        this.admin.server.dispose();

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
    let documentTypeName: string = <string>documentType;

    if (TypeUtil.isFunction(documentType)) {
      documentType = (<DocumentConstructor>documentType).name;
    }

    if (!documentType) {
      const autoGenerated: string = uuid();

      PromiseResolver.resolve<string>(autoGenerated, null, callback);
      return Promise.resolve<string>(autoGenerated);
    }

    return this._generator.generateDocumentId(document, documentType, database)
      .then((string: string) => {
        PromiseResolver.resolve<string>(string, null, callback);
        return string;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  protected assertInitialize(): void {
    if (!this._initialized) {
      throw new InvalidOperationException("You cannot open a session or access the _database commands\
 before initializing the document store. Did you forget calling initialize()?"
      );
    }
  }

  protected createRequestExecutor(database?: string, forSingleNode?: boolean): RequestExecutor {    
    const dbName: string = database || this._database;
    const executor: IRequestExecutor = (true === forSingleNode)
      ? RequestExecutor.createForSingleNode(this.singleNodeUrl, dbName)
      : RequestExecutor.create(this.urls, dbName);
    
    return <RequestExecutor>executor;
  }
}