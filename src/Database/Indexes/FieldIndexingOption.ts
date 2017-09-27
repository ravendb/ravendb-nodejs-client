export type FieldIndexingOption = 'No' | 'Search' | 'Exact' | 'Default';

export class FieldIndexingOptions {
  public static readonly No: FieldIndexingOption = 'No';
  public static readonly Search: FieldIndexingOption = 'Search';
  public static readonly Exact: FieldIndexingOption = 'Exact';
  public static readonly Default: FieldIndexingOption = 'Default';
}