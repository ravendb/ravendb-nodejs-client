import {IDocument} from '../IDocument';
import {IDocumentQuery} from './IDocumentQuery';

export interface IDocumentSession {
  query<T extends IDocument>(): IDocumentQuery<T>;
}