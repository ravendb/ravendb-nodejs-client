export type EscapeQueryOption = 0 | 1 | 2 | 3;

export class EscapeQueryOptions {
  public static readonly EscapeAll: EscapeQueryOption = 0;
  public static readonly AllowPostfixWildcard: EscapeQueryOption = 1;
  public static readonly AllowAllWildcards: EscapeQueryOption = 2;
  public static readonly RawQuery: EscapeQueryOption = 3;
}
