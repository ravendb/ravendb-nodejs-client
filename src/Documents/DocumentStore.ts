import {IDocument} from './IDocument';
import {IDocumentStore} from './IDocumentStore';
import {IDocumentSession} from "./Session/IDocumentSession";
import {DocumentSession} from "./Session/DocumentSession";
import {RequestExecutor} from '../Http/RequestExecutor';
import {DocumentConventions} from './Conventions/DocumentConventions';

export class DocumentStore implements IDocumentStore {
  protected url: string;
  protected database: string;
  protected apiKey?: string;
  private _requestExecutor: RequestExecutor;
  private _conventions: DocumentConventions;

  public get requestExecutor(): RequestExecutor {
    if (!this._requestExecutor) {
      //TODO create
    }

    return this._requestExecutor;
  }

  public get conventions(): DocumentConventions {
    if (!this._conventions) {
      //TODO create
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
    return this;
  }

  public openSession(database?: string, forceReadFromMaster: boolean = false): IDocumentSession {
    return new DocumentSession(database, this, this.requestExecutor, "", forceReadFromMaster);
  }

  public generateId(database: string, entity: IDocument): string {
    return '';
  }
}