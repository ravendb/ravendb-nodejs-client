import {IDocumentQuery} from './IDocumentQuery';

export interface IDocumentSession
{
  Query<T>(): IDocumentQuery<T>;
}