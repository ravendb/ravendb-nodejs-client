import {IDocumentQuery} from './IDocumentQuery';

export interface IDocumentSession {
  query<T>(): IDocumentQuery<T>;
}