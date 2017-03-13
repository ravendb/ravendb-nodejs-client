import {DocumentID, IDocument} from './IDocument';
import {Document} from './Document';
import {IDocumentStore} from './IDocumentStore';
import {IDocumentSession} from "./Session/IDocumentSession";
import {DocumentSession} from "./Session/DocumentSession";
import {ServerNode} from '../Http/ServerNode';
import {RequestsExecutor} from '../Http/RequestsExecutor';
import {IDCallback} from '../Utility/Callbacks';
import {DocumentConventions} from './Conventions/DocumentConventions';
import {InvalidOperationException} from '../Database/DatabaseExceptions';
import {IHiloKeyGenerator} from '../Hilo/IHiloKeyGenerator';
import {HiloMultiDatabaseKeyGenerator} from '../Hilo/HiloMultiDatabaseKeyGenerator';
import * as uuid from 'uuid';
import * as Promise from 'bluebird';

export class DocumentStore implements IDocumentStore {
  protected url: string;
  protected database: string;
  protected apiKey?: string;
  protected sessionId: string;
  protected generator: IHiloKeyGenerator;
  protected initialized: boolean = false;
  private _requestsExecutor: RequestsExecutor;
  private _conventions: DocumentConventions<IDocument>;

  public get requestsExecutor(): RequestsExecutor {
    if (!this._requestsExecutor) {
      this._requestsExecutor = this.createRequestsExecutor();
    }

    return this._requestsExecutor;
  }

  public get conventions(): DocumentConventions<IDocument> {
    if (!this._conventions) {
      this._conventions = new DocumentConventions<Document>(Document);
    }

    return this._conventions;
  }

  constructor(url: string, defaultDatabase: string, apiKey?: string) {
    this.url = url;
    this.database = defaultDatabase;
    this.apiKey = apiKey;
  }

  static create(url: string, defaultDatabase: string, apiKey?: string): IDocumentStore {
    return new DocumentStore(url, defaultDatabase, apiKey);
  }

  public initialize(): IDocumentStore {
    if (!this.initialized) {
      if (!this.database) {
        throw new InvalidOperationException("Default database isn't set.");
      }

      this.generator = new HiloMultiDatabaseKeyGenerator(this);
    }

    this.initialized = true;
    return this;
  }

  public finalize(): IDocumentStore {
    return this;
  }

  public openSession(database?: string, forceReadFromMaster: boolean = false): IDocumentSession {
    if (!this.initialized) {
      throw new InvalidOperationException("You cannot open a session or access the database commands\
 before initializing the document store. Did you forget calling initialize()?"
      );
    }

    let dbName: string = this.database;
    let executor: RequestsExecutor = this.requestsExecutor;

    if (database && (database !== dbName)) {
      dbName = database;
      executor = this.createRequestsExecutor(dbName);
    }

    this.sessionId = uuid();
    return new DocumentSession(dbName, this, executor, this.sessionId, forceReadFromMaster);
  }

  public generateId(database: string, entity: IDocument, callback?: IDCallback): Promise<DocumentID> {
    return this.generator.generateDocumentKey(database, entity, callback);
  }

  protected createRequestsExecutor(database?: string) {
    return new RequestsExecutor(new ServerNode(this.url, database || this.database, this.apiKey), this.conventions);
  }
}