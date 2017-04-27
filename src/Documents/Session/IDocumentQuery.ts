import {IDocument} from '../IDocument';
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import * as Promise from 'bluebird'
import {EscapeQueryOption} from "./EscapeQueryOptions";
import {LuceneValue} from "../Lucene/LuceneValue";
import {QueryResultsWithStatistics} from "./DocumentQuery";
import {QueryResultsCallback} from "../../Utility/Callbacks";
import {QueryOperator} from "./QueryOperator";

export interface IDocumentQueryOptions {
  usingDefaultOperator?: QueryOperator;
  waitForNonStaleResults?: boolean;
  includes?: string[];
  withStatistics?: boolean;
}

export interface IDocumentQuery {
  select(...args: string[]): IDocumentQuery;
  search(fieldName: string, searchTerms: string | string[], escapeQueryOptions?: EscapeQueryOption, boost?: number): IDocumentQuery;
  where(conditions: IDocumentQueryConditions): IDocumentQuery;
  whereEquals<V extends LuceneValue>(fieldName: string, value: V, escapeQueryOptions?: EscapeQueryOption): IDocumentQuery;
  whereEndsWith(fieldName: string, value: string): IDocumentQuery;
  whereStartsWith(fieldName: string, value: string): IDocumentQuery;
  whereIn<V extends LuceneValue>(fieldName: string, values: V[]): IDocumentQuery;
  whereBetween<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery;
  whereBetweenOrEqual<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery;
  whereGreaterThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery;
  whereGreaterThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery;
  whereLessThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery;
  whereLessThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery;
  whereIsNull(fieldName: string): IDocumentQuery;
  whereNotNull(fieldName: string): IDocumentQuery;
  orderBy(fieldsNames: string | string[]): IDocumentQuery;
  orderByDescending(fieldsNames: string | string[]): IDocumentQuery;
  andAlso(): IDocumentQuery;
  orElse(): IDocumentQuery;
  addNot(): IDocumentQuery;
  get(callback?: QueryResultsCallback<IDocument[]>): Promise<IDocument[]>;
  get(callback?: QueryResultsCallback<QueryResultsWithStatistics<IDocument>>): Promise<QueryResultsWithStatistics<IDocument>>;
}