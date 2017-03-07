import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery} from "./IDocumentQuery";
import {DocumentQuery} from "./DocumentQuery";
import {IDocument} from '../IDocument';
import {IDocumentStore} from '../IDocumentStore';
import {RequestExecutor} from '../../Http/RequestExecutor';
import {DocumentConventions} from '../Conventions/DocumentConventions';

export class DocumentSession implements IDocumentSession
{
  protected Database: string;
  protected DocumentStore: IDocumentStore;
  protected _NumberOfRequestsInSession: number;
  protected _DocumentsByEntity: IDocument[];

  public get NumberOfRequestsInSession(): number
  {
    return this._NumberOfRequestsInSession;
  }

  public get EntitiesAndMetadata(): IDocument[]
  {
    return this._DocumentsByEntity;
  }
        
  public get Conventions(): DocumentConventions
  {
    return this.DocumentStore.Conventions;
  }       

  constructor (Database: string, DocumentStore: IDocumentStore, RequestsExecutor: RequestExecutor, SessionId: string, ForceReadFromMaster: boolean)
  {
      
  }

  public Query<T>(): IDocumentQuery<T>
  {
    return new DocumentQuery<T>();
  }
}