export type QueryOperator = 'OR' | 'AND';

export class QueryOperators {
  public static readonly OR: QueryOperator = 'OR';
  public static readonly AND: QueryOperator = 'AND';

  public static isAnd(operator: QueryOperator): boolean {
    return QueryOperators.AND === operator;
  }

  public static isOr(operator: QueryOperator): boolean {
    return QueryOperators.OR === operator;
  }
}