export type rqlOperator = 'greaterThan' | 'lessThan' | 'search' | 'equals' | 'between' | 'endsWith' | 'startsWith' | 'in' | 'boost' | 'exact';

export class RqlOperators {
  public static readonly GREATER_THAN: rqlOperator = 'greaterThan';
  public static readonly LESS_THAN: rqlOperator = 'lessThan';
  public static readonly SEARCH: rqlOperator = 'search';
  public static readonly EQUALS: rqlOperator = 'equals';
  public static readonly BETWEEN: rqlOperator = 'between';
  public static readonly ENDS_WITH: rqlOperator = 'endsWith';
  public static readonly STARTS_WITH: rqlOperator = 'startsWith';
  public static readonly IN: rqlOperator = 'in';
  public static readonly BOOST: rqlOperator = 'boost';
  public static readonly EXACT: rqlOperator = 'exact';
}