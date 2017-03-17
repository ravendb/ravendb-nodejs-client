import {DocumentKey, IDocument} from './IDocument';
import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestsExecutor} from '../Http/RequestsExecutor';
import {DocumentConventions} from './Conventions/DocumentConventions';
import {EntityKeyCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export interface IDocumentStore {
  database: string;
  conventions: DocumentConventions<IDocument>;
  initialize(): IDocumentStore;
  openSession(database?: string, forceReadFromMaster?: boolean) : IDocumentSession;
  generateId(entity: IDocument, database?: string, callback?: EntityKeyCallback): Promise<DocumentKey>;
  getRequestsExecutor(database?: string): RequestsExecutor;
}