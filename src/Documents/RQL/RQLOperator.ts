export type rqlOperator = 'greaterThan' | 'lessThan' | 'search' | 'equals' | 'between' | 'endsWith' | 'startsWith' | 'in' | 'boost';

export class rqlOperators {
  public static readonly greaterThan: rqlOperator = 'greaterThan';
  public static readonly lessThan: rqlOperator = 'lessThan';
  public static readonly search: rqlOperator = 'search';
  public static readonly equals: rqlOperator = 'equals';
  public static readonly between: rqlOperator = 'between';
  public static readonly endsWith: rqlOperator = 'endsWith';
  public static readonly startsWith: rqlOperator = 'startsWith';
  public static readonly in: rqlOperator = 'in';
  public static readonly boost: rqlOperator = 'boost';
}