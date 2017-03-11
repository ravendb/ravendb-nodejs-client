import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocument} from '../IDocument';
import {DocumentConventions} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions<IDocument>;

  create(attributes?: Object): IDocument;
  load(keyOrKeys: string | string[], callback?: EntityCallback<IDocument> | EntitiesArrayCallback<IDocument>): Promise<IDocument> | Promise<IDocument[]>;
  delete(keyOrEntity: string | IDocument, callback?: EntityCallback<IDocument>): Promise<IDocument>;
  store(entity: IDocument, key?: string, etag?: string, forceConcurrencyCheck?: boolean, callback?: EntityCallback<IDocument>): Promise<IDocument>;
  query(): IDocumentQuery;
  incrementRequestsCount(): void;
}