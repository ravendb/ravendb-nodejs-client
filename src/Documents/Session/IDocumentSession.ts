import {IDocumentSession} from "./IDocumentSession";
import {AdvancedSessionOperations} from "./AdvancedSessionOperations";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQueryBase} from "./DocumentQuery";
import {DocumentConventions, DocumentConstructor, DocumentType} from '../Conventions/DocumentConventions';
import {AbstractCallback, EntityCallback, EntitiesArrayCallback} from '../../Typedef/Callbacks';
import {IRavenObject} from "../../Typedef/IRavenObject";
import {RequestExecutor} from '../../Http/Request/RequestExecutor';

export interface ISessionOptions {
  database?: string;
  requestExecutor?: RequestExecutor;
}

export interface ISessionOperationOptions<T, C extends AbstractCallback<T>> {
  documentType?: DocumentType<T>,
  includes?: string[],
  nestedObjectTypes?: IRavenObject<DocumentConstructor>,
  expectedChangeVector?: string,
  callback?: C
}

export interface IDocumentSession {
  numberOfRequestsInSession: number;
  conventions: DocumentConventions;
  advanced: AdvancedSessionOperations;

  load<T extends Object = IRavenObject>(id: string, callback?: EntityCallback<T>): Promise<T>;
  load<T extends Object = IRavenObject>(id: string, options?: ISessionOperationOptions<T, EntityCallback<T>>, callback?: EntityCallback<T>): Promise<T>;
  load<T extends Object = IRavenObject>(ids: string[], callback?: EntityCallback<T>): Promise<T[]>;
  load<T extends Object = IRavenObject>(ids: string[], options?: ISessionOperationOptions<T, EntitiesArrayCallback<T>>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  delete<T extends Object = IRavenObject>(id: string, callback?: EntityCallback<T>): Promise<T>;
  delete<T extends Object = IRavenObject>(document: T, options?: ISessionOperationOptions<T, EntityCallback<T>>, callback?: EntityCallback<T>): Promise<T>;
  store<T extends Object = IRavenObject>(document: T, id?: string, callback?: EntityCallback<T>): Promise<T>;
  store<T extends Object = IRavenObject>(document: T, id?: string, options?: ISessionOperationOptions<T, EntityCallback<T>>, callback?: EntityCallback<T>): Promise<T>;
  query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T>;
  attachQuery<T extends Object = IRavenObject>(query: DocumentQueryBase<T>): void;
  saveChanges(): Promise<void>;
}
