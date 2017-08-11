import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {RQLValue} from "../RQL/RQLValue";
import {QueryResultsWithStatistics} from "./DocumentQuery";
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from "../../Utility/Callbacks";
import {QueryOperator} from "./QueryOperator";
import {IRavenObject} from "../../Database/IRavenObject";
import {DocumentConstructor, DocumentType} from "../Conventions/DocumentConventions";

export interface IDocumentQueryOptions<T> {
  documentType?: DocumentType<T>, 
  indexName?: string;
  usingDefaultOperator?: QueryOperator;
  WaitForNonStaleResults?: boolean;
  includes?: string[];
  nestedObjectTypes?: IRavenObject<DocumentConstructor>;
  withStatistics?: boolean;
}

export interface IDocumentQuery<T> {
  first(callback?: EntityCallback<T>): Promise<T>;
  count(callback?: EntitiesCountCallback): Promise<number>;
  take(docsCount: number);
  skip(skipCount: number);
  andAlso();
  orElse();
  negateNext();
  selectFields(...args: string[]): IDocumentQuery<T>;
  search(from: string, searchTerms: string | string[], boostField, boostValue, count): IDocumentQuery<T>;
  where(conditions: IDocumentQueryConditions);
  whereEquals<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  endsWith<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  startsWith<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereIn<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereBetween<V extends RQLValue>(field: string, start?: V, end?: V, orName?, orValue?): IDocumentQuery<T>;
  whereBetweenOrEqual<V extends RQLValue>(field: string, start?: V, end?: V, orName?, orValue?): IDocumentQuery<T>;
  whereGreaterThan<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereGreaterThanOrEqual<V extends RQLValue>(field: string, value: V, orName?, orValue?): IDocumentQuery<T>;
  whereLessThan<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>;
  whereLessThanOrEqual<V extends RQLValue>(field: string, value: V, orName?, orValue?): IDocumentQuery<T>;
  whereIsNull(field: string, value: string): IDocumentQuery<T>;
  whereNotNull<V extends RQLValue>(field: string, andNotFiledValue: V): IDocumentQuery<T>;
  orderBy<V extends RQLValue>(field: string, direction: string): IDocumentQuery<T>;
  get(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  get(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
}