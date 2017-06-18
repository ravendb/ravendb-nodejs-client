import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestsExecutor} from '../Http/Request/RequestsExecutor';
import {DocumentConventions, DocumentConstructor} from './Conventions/DocumentConventions';
import {EntityKeyCallback} from '../Utility/Callbacks';
import {Operations} from "../Database/Operations/Operations";

export interface IDocumentStore {
  database: string;
  operations: Operations;
  conventions: DocumentConventions;
  initialize(): IDocumentStore;
  finalize(): Promise<IDocumentStore>;
  openSession(database?: string) : IDocumentSession;
  generateId(entity: object, documentTypeOrObjectType?: string | DocumentConstructor, database?: string, callback?: EntityKeyCallback): Promise<string>;
  getRequestsExecutor(database?: string): RequestsExecutor;
}