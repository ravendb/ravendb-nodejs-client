import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {RQLValue} from "../RQL/RQLValue";
import {QueryResultsWithStatistics} from "./DocumentQuery";
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from "../../Typedef/Callbacks";
import {QueryOperator} from "./Query/QueryOperator";
import {IRavenObject} from "../../Typedef/IRavenObject";
import {DocumentConstructor, DocumentType} from "../Conventions/DocumentConventions";

export interface IDocumentQueryOptions<T> {
  documentType?: DocumentType<T>,
  indexName?: string;
  WaitForNonStaleResults?: boolean;
  includes?: string[];
  nestedObjectTypes?: IRavenObject<DocumentConstructor>;
  withStatistics?: boolean;
  fromCollection?: boolean;
  queryParameters?: object;
}

export interface IDocumentQuery<T> {
  first(callback?: EntityCallback<T>): Promise<T>;
  count(callback?: EntitiesCountCallback): Promise<number>;
  take(docsCount: number): IDocumentQuery<T>;
  skip(skipCount: number): IDocumentQuery<T>;
  andAlso(): IDocumentQuery<T>;
  orElse(): IDocumentQuery<T>;
  negateNext(): IDocumentQuery<T>;
  selectFields<V extends RQLValue>(...args: V[]): IDocumentQuery<T>;
  search(from: string, searchTerms: string | string[], boostFactor?: number): IDocumentQuery<T>;
  where(conditions: IDocumentQueryConditions);
  whereEquals<V extends RQLValue>(field: string, value: V, exact?: boolean): IDocumentQuery<T>;
  endsWith<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  startsWith<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereIn<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereBetween<V extends RQLValue>(field: string, start?: V, end?: V): IDocumentQuery<T>;
  whereGreaterThan<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereGreaterThanOrEqual<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereEqualsAndOr<V extends RQLValue>(fieldFirst: string, valueFirst: string, fieldSecond: string, valueSecond: number, fieldThird: string, valueThird: number): IDocumentQuery<T>;
  whereLessThan<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereIsNull<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereLessThanOrEqual<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereNotNull(field: string): IDocumentQuery<T>;
  orderBy(field: string, direction: string): IDocumentQuery<T>;
  get(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  get(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
}