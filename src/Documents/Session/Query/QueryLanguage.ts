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
  | 'startsWith' | 'endsWith' | 'exists' | 'within' | 'contains' | 'disjoint' | 'intersects';

export class WhereOperators {
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
  public static readonly Within: WhereOperator = 'within';
  public static readonly Contains: WhereOperator = 'contains';
  public static readonly Disjoint: WhereOperator = 'disjoint';
  public static readonly Intersects: WhereOperator = 'intersects';
}

export type ConditionValueUnit = 'Kilometers' | 'Miles';

export class ConditionValueUnits {
  public static readonly DefaultDistanceErrorPct: number = 0.025;
  public static readonly EarthMeanRadiusKm: number = 6371.0087714;
  public static readonly MilesToKm: number = 1.60934;

  public static readonly Kilometers: ConditionValueUnit = 'Kilometers';
  public static readonly Miles: ConditionValueUnit = 'Miles';
}