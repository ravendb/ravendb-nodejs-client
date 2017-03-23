export type LuceneOperator = 'in' | 'between' | 'equal_between' | 'search' | 'starts_with' | 'ends_with' | 'equals';

export class LuceneOperators {
  public static readonly Equals: LuceneOperator = 'equals';
  public static readonly In: LuceneOperator = 'in';
  public static readonly Between: LuceneOperator = 'between';
  public static readonly EqualBetween: LuceneOperator = 'equal_between';
  public static readonly Search: LuceneOperator = 'search';
  public static readonly StartsWith: LuceneOperator = 'starts_with';
  public static readonly EndsWith: LuceneOperator = 'ends_with';
}
