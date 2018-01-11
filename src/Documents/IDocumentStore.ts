import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestExecutor} from '../Http/Request/RequestExecutor';
import {DocumentConventions, DocumentType} from './Conventions/DocumentConventions';
import {EntityIdCallback} from '../Typedef/Callbacks';
import {ISessionOptions} from './Session/IDocumentSession';
import {OperationExecutor, AdminOperationExecutor} from '../Database/Operations/OperationExecutor';
import {IDisposable} from '../Typedef/Contracts';
import {IStoreAuthOptions} from '../Auth/AuthOptions';

export interface IDocumentStore extends IDisposable<Promise<IDocumentStore>> {
  authOptions: IStoreAuthOptions;
  database: string;
  urls: string[];
  singleNodeUrl: string;
  conventions: DocumentConventions;
  operations: OperationExecutor;
  maintenance: AdminOperationExecutor;
  initialize(): IDocumentStore;
  openSession(database?: string) : IDocumentSession;
  openSession(options?: ISessionOptions) : IDocumentSession;
  openSession(database?: string, options?: ISessionOptions) : IDocumentSession;
  generateId(document: object, documentType?: DocumentType, database?: string, callback?: EntityIdCallback): Promise<string>;
  getRequestExecutor(database?: string): RequestExecutor;
}