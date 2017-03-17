import {IDocument} from '../IDocument';
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'
import {EscapeQueryOptions} from "./EscapeQueryOptions";

export interface IDocumentQuery {
  select(...args: string[]): IDocumentQuery;
  search(fieldName: string, searchTerms: string | string[], escapeQueryOptions: EscapeQueryOptions, boost: number): IDocumentQuery;
  where(conditions: IDocumentQueryConditions): IDocumentQuery;
  whereEquals<V>(fieldName: string, value: V, escapeQueryOptions: EscapeQueryOptions): IDocumentQuery;
  whereEndsWith<V>(fieldName: string, value: V): IDocumentQuery;
  whereStartsWith<V>(fieldName: string, value: V): IDocumentQuery;
  whereIn<V>(fieldName: string, values: V[]): IDocumentQuery;
  whereBetween<V>(fieldName: string, start: V, end: V): IDocumentQuery;
  whereBetweenOrEqual<V>(fieldName: string, start: V, end: V): IDocumentQuery;
  whereGreaterThan<V>(fieldName: string, value: V): IDocumentQuery;
  whereGreaterThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery;
  whereLessThan<V>(fieldName: string, value: V): IDocumentQuery;
  whereLessThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery;
  whereIsNull(fieldName: string): IDocumentQuery;
  whereNotNull(fieldName: string): IDocumentQuery;
  orderBy(fieldsNames: string | string[]): IDocumentQuery;
  orderByDescending(fieldsNames: string | string[]): IDocumentQuery;
  andAlso(): IDocumentQuery;
  orElse(): IDocumentQuery;
  addNot(): IDocumentQuery;
  boost(value): IDocumentQuery;
  first(callback?: EntityCallback<IDocument>): Promise<IDocument>;
  get(callback?: EntitiesArrayCallback<IDocument>): Promise<IDocument[]>;
  count(callback?: EntitiesCountCallback): Promise<number>;
}