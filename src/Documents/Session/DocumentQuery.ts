import {IDocument} from "../IDocument";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {DocumentCallback, DocumentQueryCallback, DocumentCountQueryCallback} from '../Callbacks';
import * as Promise from 'bluebird'

export class DocumentQuery<T extends IDocument> implements IDocumentQuery<T> {
  select(...args): IDocumentQuery<T> {
    return this;
  }

  where(conditions: IDocumentQueryConditions): IDocumentQuery<T> {
    return this;
  }

  whereEquals<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereEndsWith<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereStartsWith<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereIn<V>(fieldName: string, values: V[]): IDocumentQuery<T> {
    return this;
  }

  whereBetween<V>(fieldName: string, start: V, end: V): IDocumentQuery<T> {
    return this;
  }

  whereBetweenOrEqual<V>(fieldName: string, start: V, end: V): IDocumentQuery<T> {
    return this;
  }

  whereGreaterThan<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereGreaterThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereLessThan<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereLessThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  whereIsNull(fieldName: string): IDocumentQuery<T> {
    return this;
  }

  whereNotNull(fieldName: string): IDocumentQuery<T> {
    return this;
  }

  orderBy(fieldsNames: string|string[]): IDocumentQuery<T> {
    return this;
  }

  orderByDescending(fieldsNames: string|string[]): IDocumentQuery<T> {
    return this;
  }

  andAlso(): IDocumentQuery<T> {
    return this;
  }

  orElse(): IDocumentQuery<T> {
    return this;
  }

  addNot(): IDocumentQuery<T> {
    return this;
  }

  boost(value): IDocumentQuery<T> {
    return this;
  }

  first(callback?: DocumentCallback<T>): Promise<T> {
    return new Promise<T>(() => {});
  }

  get(callback?: DocumentQueryCallback<T>): Promise<T> {
    return new Promise<T>(() => {});
  }

  count(callback?: DocumentCountQueryCallback): Promise<number> {
    return new Promise<number>((resolve) => resolve(1));
  }
}