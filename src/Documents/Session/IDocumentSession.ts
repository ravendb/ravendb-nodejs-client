import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentConventions, DocumentConstructor, INestedObjectTypes} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions;

  create<T extends Object>(attributes?: Object, documentTypeOrObjectType?: string | DocumentConstructor<T>, nestedObjectTypes?: INestedObjectTypes): T;
  load<T extends Object>(keyOrKeys: string, documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: INestedObjectTypes, callback?: EntityCallback<T>): Promise<T>;
  load<T extends Object>(keyOrKeys: string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: INestedObjectTypes, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  delete(keyOrEntity: string | Object, callback?: EntityCallback<Object>): Promise<Object>;
  store(entity: Object, documentType?: string, key?: string, etag?: number, forceConcurrencyCheck?: boolean, callback?: EntityCallback<Object>): Promise<Object>;
  query(documentType?: string, indexName?: string, options?: IDocumentQueryOptions): IDocumentQuery;
  incrementRequestsCount(): void;
}