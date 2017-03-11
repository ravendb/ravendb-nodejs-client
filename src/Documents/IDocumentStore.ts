import {IDocument} from './IDocument';
import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestExecutor} from '../Http/RequestExecutor';
import {DocumentConventions} from './Conventions/DocumentConventions';

export interface IDocumentStore {
  requestExecutor: RequestExecutor;
  conventions: DocumentConventions<IDocument>;
  initialize(): IDocumentStore;
  openSession(database?: string, forceReadFromMaster?: boolean) : IDocumentSession;
  generateId(database: string, entity: IDocument): string;
}