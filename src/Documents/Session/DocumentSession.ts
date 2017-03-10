import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery} from "./IDocumentQuery";
import {DocumentQuery} from "./DocumentQuery";
import {IDocument} from '../IDocument';
import {IDocumentStore} from '../IDocumentStore';
import {RequestExecutor} from '../../Http/RequestExecutor';
import {DocumentConventions} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'

export class DocumentSession implements IDocumentSession {
  protected database: string;
  protected documentStore: IDocumentStore;
  private _numberOfRequestsInSession: number;

  public get numberOfRequestsInSession(): number {
    return this._numberOfRequestsInSession;
  }

  public get conventions(): DocumentConventions {
    return this.documentStore.conventions;
  }       

  constructor (database: string, documentStore: IDocumentStore, requestsExecutor: RequestExecutor, sessionId: string, forceReadFromMaster: boolean) {
      
  }

  public load(keyOrKeys: string | string[], callback?: EntityCallback<IDocument>): Promise<IDocument> {
    return new Promise<IDocument>(()=>{});
  }

  public delete(keyOrEntity: string | IDocument, callback?: EntityCallback<IDocument> | EntitiesArrayCallback<IDocument>): Promise<IDocument> | Promise<IDocument[]> {
    return new Promise<IDocument>(()=>{});
  }

  public store(entity: IDocument, key?: string, etag?: string, forceConcurrencyCheck?: boolean, callback?: EntityCallback<IDocument>): Promise<IDocument> {
    return new Promise<IDocument>(()=>{});
  }

  public query(): IDocumentQuery {
    return new DocumentQuery();
  }

  public incrementRequestsCount(): void {

  }
}