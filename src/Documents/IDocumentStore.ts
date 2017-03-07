import {IDocument} from './IDocument';
import {IDocumentSession} from "./Session/IDocumentSession";
import {RequestExecutor} from '../Http/RequestExecutor';
import {DocumentConventions} from './Conventions/DocumentConventions';

export interface IDocumentStore
{
  RequestExecutor: RequestExecutor;
  Conventions: DocumentConventions;
  Initialize(): IDocumentStore;
  OpenSession(Database?: string, ForceReadFromMaster?: boolean) : IDocumentSession;
  GenerateId(Database: string, Entity: IDocument): string;
}