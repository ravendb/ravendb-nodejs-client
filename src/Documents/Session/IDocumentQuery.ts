import {QueryResultsWithStatistics} from "./DocumentQuery";
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from "../../Typedef/Callbacks";
import {IRavenObject} from "../../Typedef/IRavenObject";
import {DocumentConstructor, DocumentConventions, DocumentType} from "../Conventions/DocumentConventions";
import {ConditionValue, OrderingType, SearchOperator} from "./Query/QueryLanguage";
import {SpatialCriteria} from "./Query/Spatial/SpatialCriteria";
import {WhereParams} from "./Query/WhereParams";

export interface IDocumentQueryOptions<T> {
  documentType?: DocumentType<T>,
  indexName?: string;
  waitForNonStaleResults?: boolean;
  includes?: string[];
  nestedObjectTypes?: IRavenObject<DocumentConstructor>;
  withStatistics?: boolean;
  fromCollection?: boolean;
  queryParameters?: object;
}

//TODO add commented methods to DocumentQuery
export interface IDocumentQuery<T> {
  // and: IDocumentQuery<T>;
  or: IDocumentQuery<T>;
  not: IDocumentQuery<T>;
  // indexName: string; //TODO change property to public or remove this from interface
  // collectionName: string;
  // conventions: DocumentConventions;
  // isDynamicMapReduce: boolean;
  // getProjectionFields(): string[];
  // randomOrdering(seed?: string): IDocumentQuery<T>;
  // customSortUsing(typeName: string, descending?: boolean): IDocumentQuery<T>;
  // include(path: string): IDocumentQuery<T>;
  take(count: number): IDocumentQuery<T>;
  skip(count: number): IDocumentQuery<T>;
  // whereEquals<V extends ConditionValue>(whereParams: WhereParams<V>): IDocumentQuery<T>;
  whereEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  // whereNotEquals<V extends ConditionValue>(whereParams: WhereParams<V>): IDocumentQuery<T>;
  // whereNotEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  OpenSubclause(): IDocumentQuery<T>;
  CloseSubclause(): IDocumentQuery<T>;
  negateNext(): IDocumentQuery<T>;
  whereIn<V extends ConditionValue>(fieldName: string, values: V[], exact?: boolean): IDocumentQuery<T>;
  // whereStartsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T>;
  // whereEndsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T>;
  whereBetween<V extends ConditionValue>(fieldName: string, start: V, end: V, exact?: boolean): IDocumentQuery<T>;
  whereGreaterThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  whereGreaterThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  whereLessThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  whereLessThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  // whereExists(fieldName: string): IDocumentQuery<T>;
  andAlso(): IDocumentQuery<T>;
  orElse(): IDocumentQuery<T>;
  // boost(boost: number): IDocumentQuery<T>;
  // fuzzy(fuzzy: number): IDocumentQuery<T>;
  // proximity(proximity: number): IDocumentQuery<T>;
  orderBy(field: string, ordering?: OrderingType): IDocumentQuery<T>;
  // orderByDescending(field: string, ordering?: OrderingType): IDocumentQuery<T>;
  // orderByScore(): IDocumentQuery<T>;
  // orderByScoreDescending(): IDocumentQuery<T>;
  // waitForNonStaleResults(waitTimeout?: number): IDocumentQuery<T>;
  // waitForNonStaleResultsAsOfNow(waitTimeout?: number): IDocumentQuery<T>;
  search(fieldName: string, searchTerms: string, operator: SearchOperator): IDocumentQuery<T>;
  // intersect(): IDocumentQuery<T>;
  // distinct(): IDocumentQuery<T>;
  // containsAny<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T>;
  // containsAll<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T>;
  // groupBy(fieldName: string, ...fieldNames: string[]): IDocumentQuery<T>;
  // groupByKey(fieldName: string, projectedName?: string): IDocumentQuery<T>;
  // groupBySum(fieldName: string, projectedName?: string): IDocumentQuery<T>;
  // groupByCount(projectedName?: string): IDocumentQuery<T>;
  // whereTrue(): IDocumentQuery<T>;
  // spatial(fieldName: string, criteria: SpatialCriteria): IDocumentQuery<T>;
  // orderByDistance(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
  // orderByDistance(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
  // orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
  // orderByDistanceDescending(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
  // first(callback?: EntityCallback<T>): Promise<T>;
  // single(callback?: EntityCallback<T>): Promise<T>;
  // all(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  // all(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
  // count(callback?: EntitiesCountCallback): Promise<number>;
}