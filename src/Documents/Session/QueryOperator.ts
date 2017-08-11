export type QueryOperator = 'OR' | 'AND' | 'NOT';

export class QueryOperators {
  public static readonly OR: QueryOperator = 'OR';
  public static readonly AND: QueryOperator = 'AND';
  public static readonly NOT: QueryOperator = 'NOT';

  public static isAnd(operator: QueryOperator): boolean {
    return this.AND === operator;
  }

  public static isOr(operator: QueryOperator): boolean {
    return this.OR === operator;
  }
}