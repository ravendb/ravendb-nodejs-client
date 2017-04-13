import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocument, DocumentKey, IDocumentType} from '../IDocument';
import {DocumentConventions} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions<IDocument>;

  create(attributes?: Object, documentType?: IDocumentType): IDocument;
  load(keyOrKeys: DocumentKey | DocumentKey[], includes?: string[], callback?: EntityCallback<IDocument> | EntitiesArrayCallback<IDocument>): Promise<IDocument> | Promise<IDocument[]>;
  delete(keyOrEntity: DocumentKey | IDocument, callback?: EntityCallback<IDocument>): Promise<IDocument>;
  store(entity: IDocument, documentType?: IDocumentType, key?: DocumentKey, etag?: number, forceConcurrencyCheck?: boolean, callback?: EntityCallback<IDocument>): Promise<IDocument>;
  query(documentType?: IDocumentType, indexName?: string, usingDefaultOperator?: boolean, waitForNonStaleResults?: boolean, includes?: string[], withStatistics?: boolean): IDocumentQuery;
  incrementRequestsCount(): void;
}