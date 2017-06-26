import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {EscapeQueryOption} from "./EscapeQueryOptions";
import {LuceneValue} from "../Lucene/LuceneValue";
import {QueryResultsWithStatistics} from "./DocumentQuery";
import {QueryResultsCallback} from "../../Utility/Callbacks";
import {QueryOperator} from "./QueryOperator";
import {IRavenObject} from "../../Database/IRavenObject";
import {DocumentConstructor} from "../Conventions/DocumentConventions";

export interface IDocumentQueryOptions<T> {
  documentTypeOrObjectType?: string | DocumentConstructor<T>, 
  indexName?: string;
  usingDefaultOperator?: QueryOperator;
  waitForNonStaleResults?: boolean;
  includes?: string[];
  nestedObjectTypes?: IRavenObject<DocumentConstructor>;
  withStatistics?: boolean;
}

export interface IDocumentQuery<T> {
  or: IDocumentQuery<T>;
  and: IDocumentQuery<T>;
  not: IDocumentQuery<T>;
  selectFields(...args: string[]): IDocumentQuery<T>;
  search(fieldName: string, searchTerms: string | string[], escapeQueryOptions?: EscapeQueryOption, boost?: number): IDocumentQuery<T>;
  where(conditions: IDocumentQueryConditions): IDocumentQuery<T>;
  whereEquals<V extends LuceneValue>(fieldName: string, value: V, escapeQueryOptions?: EscapeQueryOption): IDocumentQuery<T>;
  whereEndsWith(fieldName: string, value: string): IDocumentQuery<T>;
  whereStartsWith(fieldName: string, value: string): IDocumentQuery<T>;
  whereIn<V extends LuceneValue>(fieldName: string, values: V[]): IDocumentQuery<T>;
  whereBetween<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery<T>;
  whereBetweenOrEqual<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery<T>;
  whereGreaterThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereGreaterThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereLessThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereLessThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereIsNull(fieldName: string): IDocumentQuery<T>;
  whereNotNull(fieldName: string): IDocumentQuery<T>;
  orderBy(fieldsNames: string | string[]): IDocumentQuery<T>;
  orderByDescending(fieldsNames: string | string[]): IDocumentQuery<T>;
  andAlso(): IDocumentQuery<T>;
  orElse(): IDocumentQuery<T>;
  negateNext(): IDocumentQuery<T>;
  take(docsCount: number): IDocumentQuery<T>;
  skip(skipCount: number): IDocumentQuery<T>;
  get(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  get(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
}