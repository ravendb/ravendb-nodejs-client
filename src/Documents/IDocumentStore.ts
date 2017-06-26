import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestExecutor} from '../Http/Request/RequestExecutor';
import {DocumentConventions, DocumentConstructor} from './Conventions/DocumentConventions';
import {EntityKeyCallback} from '../Utility/Callbacks';
import {Operations} from '../Database/Operations/Operations';
import {ISessionOptions} from './Session/IDocumentSession';

export interface IDocumentStore {
  database: string;
  operations: Operations;
  conventions: DocumentConventions;
  initialize(): IDocumentStore;
  finalize(): Promise<IDocumentStore>;
  openSession(database?: string) : IDocumentSession;
  openSession(options?: ISessionOptions) : IDocumentSession;
  openSession(database?: string, options?: ISessionOptions) : IDocumentSession;
  generateId(entity: object, documentTypeOrObjectType?: string | DocumentConstructor, database?: string, callback?: EntityKeyCallback): Promise<string>;
  getRequestExecutor(database?: string): RequestExecutor;
}