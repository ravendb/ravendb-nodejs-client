import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestExecutor} from '../Http/Request/RequestExecutor';
import {DocumentConventions, DocumentConstructor, DocumentType} from './Conventions/DocumentConventions';
import {EntityIdCallback} from '../Utility/Callbacks';
import {ISessionOptions} from './Session/IDocumentSession';

export interface IDocumentStore {
  database: string;
  conventions: DocumentConventions;
  initialize(): IDocumentStore;
  finalize(): Promise<IDocumentStore>;
  openSession(database?: string) : IDocumentSession;
  openSession(options?: ISessionOptions) : IDocumentSession;
  openSession(database?: string, options?: ISessionOptions) : IDocumentSession;
  generateId(document: object, documentType?: DocumentType, database?: string, callback?: EntityIdCallback): Promise<string>;
  getRequestExecutor(database?: string): RequestExecutor;
}