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
  waitForNonStaleResults?: boolean;
  includes?: string[];
  nestedObjectTypes?: IRavenObject<DocumentConstructor>;
  withStatistics?: boolean;
}

export interface IDocumentQuery<T> {
  selectFields(...args: string[]): IDocumentQuery<T>;
  search(fieldName: string, searchTerms: string | string[], boost?: number): IDocumentQuery<T>;
  where(conditions: IDocumentQueryConditions);
  whereEquals<V extends RQLValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereEndsWith<V extends RQLValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereStartsWith<V extends RQLValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereIn<V extends RQLValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereBetween<V extends RQLValue>(fieldName: string, start?: V, end?: V, orName?, orValue?): IDocumentQuery<T>;
  whereBetweenOrEqual<V extends RQLValue>(fieldName: string, start?: V, end?: V, orName?, orValue?): IDocumentQuery<T>;
  whereGreaterThan<V extends RQLValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereGreaterThanOrEqual<V extends RQLValue>(fieldName: string, value: V, orName?, orValue?): IDocumentQuery<T>;
  whereLessThan<V extends RQLValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereLessThanOrEqual<V extends RQLValue>(fieldName: string, value: V, orName?, orValue?): IDocumentQuery<T>;
  whereIsNull(fieldName: string): IDocumentQuery<T>;
  whereNotNull<V extends RQLValue>(fieldName: string, andNotFiledValue: V): IDocumentQuery<T>;
  orderBy<V extends RQLValue>(fieldsNames: string, value: V): IDocumentQuery<T>;//+
  orderByDescending<V extends RQLValue>(fieldsNames: string, value: V): IDocumentQuery<T>;//+
  andAlso<V extends RQLValue>(fieldName, value: V): IDocumentQuery<T>;
  orElse<V extends RQLValue>(fieldName, value: V): IDocumentQuery<T>;
  negateNext(): IDocumentQuery<T>;
  take(docsCount: number): IDocumentQuery<T>;
  skip(skipCount: number): IDocumentQuery<T>;
  get(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  get(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
  first(callback?: EntityCallback<T>): Promise<T>;
  count(callback?: EntitiesCountCallback): Promise<number>;

  addStatement(statement: string): IDocumentQuery<T>;
  addSpace();

}