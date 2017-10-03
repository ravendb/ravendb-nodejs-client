import {IDocumentSession} from "./IDocumentSession";
import {Advanced} from "./Advanced";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQueryBase} from "./DocumentQuery";
import {DocumentConventions, DocumentConstructor, DocumentType} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Typedef/Callbacks';
import {IRavenObject} from "../../Typedef/IRavenObject";
import {RequestExecutor} from '../../Http/Request/RequestExecutor';

export interface ISessionOptions {
  database?: string;
  requestExecutor?: RequestExecutor;
}

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions;
  advanced: Advanced;

  load<T extends Object = IRavenObject>(idOrIds: string, documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntityCallback<T>): Promise<T>;
  load<T extends Object = IRavenObject>(idOrIds: string[], documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  delete<T extends Object = IRavenObject>(idOrDocument: string, expectedChangeVector?: string, callback?: EntityCallback<T>): Promise<T>;
  delete<T extends Object = IRavenObject>(idOrDocument: T, expectedChangeVector?: string, callback?: EntityCallback<T>): Promise<T>;
  store<T extends Object = IRavenObject>(document: T, id?: string, documentType?: DocumentType<T>, changeVector?: string, callback?: EntityCallback<T>): Promise<T>;
  query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T>;
  attachQuery<T extends Object = IRavenObject>(query: DocumentQueryBase<T>): void;
  saveChanges(): Promise<void>;
}