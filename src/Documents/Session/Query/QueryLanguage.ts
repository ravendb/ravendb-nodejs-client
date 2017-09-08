export type QueryConditionValue = string | number | boolean | Date | null;

export type QueryOperator = 'OR' | 'AND' | 'NOT' | '(' | ')';

export class QueryOperators {
  public static readonly OR: QueryOperator = 'OR';
  public static readonly AND: QueryOperator = 'AND';
  public static readonly NOT: QueryOperator = 'NOT';
}

export type QueryKeyword = 'SELECT' | 'DISTINCT' | 'AS' | 'FROM'
  | 'INDEX' | 'INCLUDE' | 'WHERE' | 'GROUP' | 'ORDER' | 'LOAD' | 'BY';

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
}