import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentConventions, DocumentConstructor, DocumentType} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import {IRavenObject} from "../../Database/IRavenObject";
import {RequestExecutor} from '../../Http/Request/RequestExecutor';

export interface ISessionOptions {
  database?: string;
  requestExecutor?: RequestExecutor;
}

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions;

  load<T extends Object = IRavenObject>(idOrIds: string, documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntityCallback<T>): Promise<T>;
  load<T extends Object = IRavenObject>(idOrIds: string[], documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  delete<T extends Object = IRavenObject>(idOrDocument: string, expectedEtag?: number, callback?: EntityCallback<T>): Promise<T>;
  delete<T extends Object = IRavenObject>(idOrDocument: T, expectedEtag?: number, callback?: EntityCallback<T>): Promise<T>;
  store<T extends Object = IRavenObject>(document: T, id?: string, documentType?: DocumentType<T>, etag?: number, callback?: EntityCallback<T>): Promise<T>;
  query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T>;
  saveChanges(): Promise<void>;
}