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
  delete<T extends Object>(keyOrEntity: string | T, callback?: EntityCallback<Object>): Promise<T>;
  store<T extends Object>(entity: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean, callback?: EntityCallback<T>): Promise<T>;
  query<T extends Object>(documentTypeOrObjectType?: string | DocumentConstructor<T>, indexName?: string, options?: IDocumentQueryOptions): IDocumentQuery<T>;
  incrementRequestsCount(): void;
}