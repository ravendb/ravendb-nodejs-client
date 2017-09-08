export type ConditionValue = string | number | boolean | Date | null;

export type QueryOperator = 'OR' | 'AND' | 'NOT';

export class QueryOperators {
  public static readonly OR: QueryOperator = 'OR';
  public static readonly AND: QueryOperator = 'AND';
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
  public static readonly Equals: OrderingType = 'equals';
  public static readonly NotEquals: OrderingType = 'notEquals';
  public static readonly GreaterThan: OrderingType = 'greaterThan';
  public static readonly GreaterThanOrEqual: OrderingType = 'greaterThanOrEqual';
  public static readonly LessThan: OrderingType = 'lessThan';
  public static readonly LessThanOrEqual: OrderingType = 'lessThanOrEqual';
  public static readonly In: OrderingType = 'in';
  public static readonly AllIn: OrderingType = 'allIn';
  public static readonly Between: OrderingType = 'between';
  public static readonly Search: OrderingType = 'search';
  public static readonly Lucene: OrderingType = 'lucene';
  public static readonly StartsWith: OrderingType = 'startsWith';
  public static readonly EndsWith: OrderingType = 'endsWith';
  public static readonly Exists: OrderingType = 'exists';
  public static readonly Within: OrderingType = 'within';
  public static readonly Contains: OrderingType = 'contains';
  public static readonly Disjoint: OrderingType = 'disjoint';
  public static readonly Intersects: OrderingType = 'intersects';
}

export type ConditionValueUnit = 'Kilometers' | 'Miles';

export class ConditionValueUnits {
  public static readonly Kilometers: ConditionValueUnit = 'Kilometers';
  public static readonly Miles: ConditionValueUnit = 'Miles';
}