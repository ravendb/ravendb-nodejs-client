import {IDocument} from '../IDocument';
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {DocumentCallback, DocumentQueryCallback, DocumentCountQueryCallback} from '../Callbacks';
import * as Promise from 'bluebird'

export interface IDocumentQuery<T extends IDocument> {
  select(...args: string[]): IDocumentQuery<T>;
  where(conditions: IDocumentQueryConditions): IDocumentQuery<T>;
  whereEquals<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereEndsWith<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereStartsWith<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereIn<V>(fieldName: string, values: V[]): IDocumentQuery<T>;
  whereBetween<V>(fieldName: string, start: V, end: V): IDocumentQuery<T>;
  whereBetweenOrEqual<V>(fieldName: string, start: V, end: V): IDocumentQuery<T>;
  whereGreaterThan<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereGreaterThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereLessThan<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereLessThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery<T>;
  whereIsNull(fieldName: string): IDocumentQuery<T>;
  whereNotNull(fieldName: string): IDocumentQuery<T>;
  orderBy(fieldsNames: string | string[]): IDocumentQuery<T>;
  orderByDescending(fieldsNames: string | string[]): IDocumentQuery<T>;
  andAlso(): IDocumentQuery<T>;
  orElse(): IDocumentQuery<T>;
  addNot(): IDocumentQuery<T>;
  boost(value): IDocumentQuery<T>;
  first(callback?: DocumentCallback<T>): Promise<T>;
  get(callback?: DocumentQueryCallback<T>): Promise<T>;
  count(callback?: DocumentCountQueryCallback): Promise<number>;
}