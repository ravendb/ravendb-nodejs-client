import {DocumentID, IDocument} from './IDocument';
import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestsExecutor} from '../Http/RequestsExecutor';
import {DocumentConventions} from './Conventions/DocumentConventions';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export interface IDocumentStore {
  requestsExecutor: RequestsExecutor;
  conventions: DocumentConventions<IDocument>;
  initialize(): IDocumentStore;
  openSession(database?: string, forceReadFromMaster?: boolean) : IDocumentSession;
  generateId(database: string, entity: IDocument, callback?: IDCallback): Promise<DocumentID>;
}