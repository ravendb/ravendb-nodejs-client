import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentConventions, DocumentConstructor} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import {IRavenObject} from "../../Database/IRavenObject";
import * as BluebirdPromise from 'bluebird'

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions;

  create<T extends Object = IRavenObject>(attributes?: object, documentTypeOrObjectType?: string | DocumentConstructor<T>, nestedObjectTypes?: IRavenObject<DocumentConstructor>): T;
  load<T extends Object = IRavenObject>(keyOrKeys: string, documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntityCallback<T>): Promise<T>;
  load<T extends Object = IRavenObject>(keyOrKeys: string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  delete<T extends Object = IRavenObject>(keyOrEntity: string | T, callback?: EntityCallback<T>): Promise<T>;
  store<T extends Object = IRavenObject>(entity: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean, callback?: EntityCallback<T>): Promise<T>;
  query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T>;
  incrementRequestsCount(): void;
}