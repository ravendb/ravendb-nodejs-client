export type RQLOperator = 'IN'| '<' | '>' | '=' | 'SELECT' | 'AND' | 'search()' | 'StartsWith()' | 'EndsWith()' |'BETWEEN' | 'ORDER BY' | 'ORDER BY DESC';

export class RQLOperators {
  public static readonly Equals: RQLOperator = '=';
  public static readonly Between: RQLOperator = 'BETWEEN';
  public static readonly EqualBetween: RQLOperator = 'AND';
  public static readonly Search: RQLOperator = 'search()';
  public static readonly StartsWith: RQLOperator = 'StartsWith()';
  public static readonly EndsWith: RQLOperator = 'EndsWith()';
  public static readonly In: RQLOperator = 'IN';
  public static readonly lessThan: RQLOperator = '<';
  public static readonly greaterThan: RQLOperator = '>';
  public static readonly orderBy: RQLOperator = 'ORDER BY';
  public static readonly orderByDESC: RQLOperator = 'ORDER BY DESC';
  public static readonly Select: RQLOperator = 'SELECT';
}
