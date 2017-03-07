import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocument} from '../IDocument';
import {DocumentConventions} from '../Conventions/DocumentConventions';
import {DocumentCallback} from '../Callbacks';

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions;

  load<T extends IDocument>(keyOrKeys: string | string[], callback?: DocumentCallback<T>): Promise<T>;
  delete<T extends IDocument>(keyOrEntity: string | IDocument, callback?: DocumentCallback<T>): Promise<T>;
  store<T extends IDocument>(entity: IDocument, key?: string, etag?: string, forceConcurrencyCheck?: boolean, callback?: DocumentCallback<T>): Promise<T>;
  query<T extends IDocument>(): IDocumentQuery<T>;
  incrementRequestsCount(): void;
}