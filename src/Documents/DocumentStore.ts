import {IDocument} from './IDocument';
import {IDocumentStore} from './IDocumentStore';
import {IDocumentSession} from "./Session/IDocumentSession";
import {DocumentSession} from "./Session/DocumentSession";
import {RequestExecutor} from '../Http/RequestExecutor';
import {DocumentConventions} from './Conventions/DocumentConventions';

export class DocumentStore implements IDocumentStore
{
  protected Url: string;
  protected Database: string;
  protected ApiKey?: string;
  protected _RequestExecutor: RequestExecutor;
  protected _Conventions: DocumentConventions; 

  public get RequestExecutor(): RequestExecutor
  {
    if (!this._RequestExecutor) {
      //TODO create
    }

    return this._RequestExecutor;
  }

  public get Conventions(): DocumentConventions
  {
    if (!this._Conventions) {
      //TODO create
    }

    return this._Conventions;
  }

  constructor(Url: string, DefaultDatabase: string, ApiKey?: string)
  {
    this.Url = Url;
    this.Database = DefaultDatabase;
    this.ApiKey = ApiKey;
  }

  static Create(Url: string, DefaultDatabase: string, ApiKey?: string): IDocumentStore
  {
    return new DocumentStore(Url, DefaultDatabase, ApiKey);
  }

  public Initialize(): IDocumentStore
  {
    return this;
  }

  public OpenSession(Database?: string, ForceReadFromMaster: boolean = false): IDocumentSession
  {
    //return new DocumentSession();
  }

  public GenerateId(Database: string, Entity: IDocument): string
  {
    return '';
  }
}