import {SpartialRelation, SpartialRelations} from "./Spartial/SpartialRelation";

export type ConditionValue = string | number | boolean | Date | null;

export type SearchOperator = 'OR' | 'AND';

export class SearchOperators {
  public static readonly OR: SearchOperator = 'OR';
  public static readonly AND: SearchOperator = 'AND';
}

export type QueryOperator = SearchOperator | 'NOT';

export class QueryOperators extends SearchOperators {
  public static readonly NOT: QueryOperator = 'NOT';
}

export type QueryKeyword = 'SELECT' | 'DISTINCT' | 'AS' | 'FROM'
  | 'INDEX' | 'INCLUDE' | 'WHERE' | 'GROUP' | 'ORDER' | 'LOAD'
  | 'BY' | 'ASC' | 'DESC' | 'ALL' | 'IN' | 'BETWEEN';

export class QueryKeywords {
  public static readonly Select: QueryKeyword = 'SELECT';
  public static readonly Distinct: QueryKeyword = 'DISTINCT';
  public static readonly As: QueryKeyword = 'AS';
  public static readonly From: QueryKeyword = 'FROM';
  public static readonly Index: QueryKeyword = 'INDEX';
  public static readonly Include: QueryKeyword = 'INCLUDE';
  public static readonly Where: QueryKeyword = 'WHERE';
  public static readonly Group: QueryKeyword = 'GROUP';
  public static readonly Order: QueryKeyword = 'ORDER';
  public static readonly Load: QueryKeyword = 'LOAD';
  public static readonly By: QueryKeyword = 'BY';
  public static readonly Asc: QueryKeyword = 'ASC';
  public static readonly Desc: QueryKeyword = 'DESC';
  public static readonly In: QueryKeyword = 'IN';
  public static readonly Between: QueryKeyword = 'BETWEEN';
  public static readonly All: QueryKeyword = 'ALL';
}

export type OrderingType = 'string' | 'long' | 'double' | 'alphaNumeric';

export class OrderingTypes {
  public static readonly String: OrderingType = 'string';
  public static readonly Long: OrderingType = 'long';
  public static readonly Double: OrderingType = 'double';
  public static readonly AlphaNumeric: OrderingType = 'alphaNumeric';
}

export type WhereOperator = 'equals' | 'notEquals' | 'greaterThan' | 'greaterThanOrEqual'
  | 'lessThan' | 'lessThanOrEqual' | 'in' | 'allIn' | 'between' | 'search' | 'lucene'
  | 'startsWith' | 'endsWith' | 'exists' | SpartialRelation;

export class WhereOperators extends SpartialRelations {
  public static readonly Equals: WhereOperator = 'equals';
  public static readonly NotEquals: WhereOperator = 'notEquals';
  public static readonly GreaterThan: WhereOperator = 'greaterThan';
  public static readonly GreaterThanOrEqual: WhereOperator = 'greaterThanOrEqual';
  public static readonly LessThan: WhereOperator = 'lessThan';
  public static readonly LessThanOrEqual: WhereOperator = 'lessThanOrEqual';
  public static readonly In: WhereOperator = 'in';
  public static readonly AllIn: WhereOperator = 'allIn';
  public static readonly Between: WhereOperator = 'between';
  public static readonly Search: WhereOperator = 'search';
  public static readonly Lucene: WhereOperator = 'lucene';
  public static readonly StartsWith: WhereOperator = 'startsWith';
  public static readonly EndsWith: WhereOperator = 'endsWith';
  public static readonly Exists: WhereOperator = 'exists';
}

export class FieldConstants {
  public static readonly CustomSortFieldName: string = "__customSort";
  public static readonly DocumentIdFieldName: string = "id()";
  public static readonly ReduceKeyHashFieldName: string = "hash(key())";
  public static readonly ReduceKeyValueFieldName: string = "key()";
  public static readonly AllFields: string = "__all_fields";
  public static readonly AllStoredFields: string = "__all_stored_fields";
  public static readonly SpatialShapeFieldName: string = "spatial(shape)";
  public static readonly RangeFieldSuffix: string = "_Range";
  public static readonly RangeFieldSuffixLong: string = "_L" + FieldConstants.RangeFieldSuffix;
  public static readonly RangeFieldSuffixDouble: string = "_D" + FieldConstants.RangeFieldSuffix;
  public static readonly NullValue: string = "NULL_VALUE";
  public static readonly EmptyString: string = "EMPTY_STRING";
}