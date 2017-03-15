import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocument, DocumentKey} from '../IDocument';
import {DocumentConventions} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions<IDocument>;

  create(attributes?: Object): IDocument;
  load(keyOrKeys: DocumentKey | DocumentKey[], callback?: EntityCallback<IDocument> | EntitiesArrayCallback<IDocument>): Promise<IDocument> | Promise<IDocument[]>;
  delete(keyOrEntity: DocumentKey | IDocument, callback?: EntityCallback<IDocument>): Promise<IDocument>;
  store(entity: IDocument, key?: DocumentKey, etag?: string, forceConcurrencyCheck?: boolean, callback?: EntityCallback<IDocument>): Promise<IDocument>;
  query(): IDocumentQuery;
  incrementRequestsCount(): void;
}