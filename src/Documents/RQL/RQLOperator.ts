export type RQLOperator = 'greaterThan' | 'lessThan' | 'search' | 'equals' | 'between' | 'endsWith' | 'startsWith' | 'in' | 'boost' | 'exact';

export type RQLJoinOperator = 'OR' | 'AND' | 'NOT' | '(' | ')';

export type RQLOrderDirection = 'ASC' | 'DESC';

export class RQLJoinOperators {
  public static readonly OR: RQLJoinOperator = 'OR';
  public static readonly AND: RQLJoinOperator = 'AND';
  public static readonly NOT: RQLJoinOperator = 'NOT';
  public static readonly OPEN_SUBCLAUSE: RQLJoinOperator = '(';
  public static readonly CLOSE_SUBCLAUSE: RQLJoinOperator = ')';
}

export class RQLOperators {
  public static readonly GREATER_THAN: RQLOperator = 'greaterThan';
  public static readonly LESS_THAN: RQLOperator = 'lessThan';
  public static readonly SEARCH: RQLOperator = 'search';
  public static readonly EQUALS: RQLOperator = 'equals';
  public static readonly BETWEEN: RQLOperator = 'between';
  public static readonly ENDS_WITH: RQLOperator = 'endsWith';
  public static readonly STARTS_WITH: RQLOperator = 'startsWith';
  public static readonly IN: RQLOperator = 'in';
  public static readonly BOOST: RQLOperator = 'boost';
  public static readonly EXACT: RQLOperator = 'exact';
}

export class RQLOrderDirections {
  public static readonly Ascending: RQLOrderDirection = 'ASC';
  public static readonly Descending: RQLOrderDirection = 'DESC';
}

export interface IRQLOperatorOptions {}

export interface IRQLEqualsOperatorOptions extends IRQLOperatorOptions {
  exact?: boolean;
}