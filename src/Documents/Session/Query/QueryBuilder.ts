import {IQueryBuilder} from "./IQueryBuilder";
import {OrderingType} from "./QueryLanguage";
import {SearchOperator} from "./QueryLanguage";
import {SpartialCriteria} from "./Spartial/SpartialCriteria";

export class QueryBuilder implements IQueryBuilder {
  getProjectionFields(): string[] {
    return [];
  }

  randomOrdering(seed?: string): IQueryBuilder {
    return this;
  }

  customSortUsing(typeName: string, descending?: boolean): IQueryBuilder {
    return this;
  }

  include(path: string): IQueryBuilder {
    return this;
  }

  whereEquals(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereNotEquals(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  openSubclause(): IQueryBuilder {
    return this;
  }

  closeSubclause(): IQueryBuilder {
    return this;
  }

  negateNext(): IQueryBuilder {
    return this;
  }

  whereIn(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereStartsWith(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  whereEndsWith(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  whereBetween(fieldName: string, fromParameterName: string, toParameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereGreaterThan(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereGreaterThanOrEqual(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereLessThan(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereLessThanOrEqual(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder {
    return this;
  }

  whereExists(fieldName: string): IQueryBuilder {
    return this;
  }

  andAlso(): IQueryBuilder {
    return this;
  }

  orElse(): IQueryBuilder {
    return this;
  }

  boost(boost: number): IQueryBuilder {
    return this;
  }

  fuzzy(fuzzy: number): IQueryBuilder {
    return this;
  }

  proximity(proximity: number): IQueryBuilder {
    return this;
  }

  orderBy(field: string, ordering?: OrderingType): IQueryBuilder {
    return this;
  }

  orderByDescending(field: string, ordering?: OrderingType): IQueryBuilder {
    return this;
  }

  orderByScore(): IQueryBuilder {
    return this;
  }

  orderByScoreDescending(): IQueryBuilder {
    return this;
  }

  search(fieldName: string, searchTerms: string, operator: SearchOperator): IQueryBuilder {
    return this;
  }

  intersect(): IQueryBuilder {
    return this;
  }

  distinct(): IQueryBuilder {
    return this;
  }

  containsAny(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  containsAll(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  groupBy(fieldName: string, ...fieldNames): IQueryBuilder {
    return this;
  }

  groupByKey(fieldName: string, projectedName?: string): IQueryBuilder {
    return this;
  }

  groupBySum(fieldName: string, projectedName?: string): IQueryBuilder {
    return this;
  }

  groupByCount(projectedName?: string): IQueryBuilder {
    return this;
  }

  whereTrue(): IQueryBuilder {
    return this;
  }

  spatial(fieldName: string, criteria: SpartialCriteria): IQueryBuilder {
    return this;
  }

  orderByDistance(fieldName: string, shapeWkt: string): IQueryBuilder;
  orderByDistance(fieldName: string, latitude: number, longitude: number): IQueryBuilder;
  orderByDistance(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IQueryBuilder {
    return this;
  }

  orderByDistanceDescending(fieldName: string, shapeWkt: string): IQueryBuilder;
  orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): IQueryBuilder;
  orderByDistanceDescending(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IQueryBuilder {
    return this;
  }
}