import {LuceneOperator, LuceneOperators} from "./LuceneOperator";
import {LuceneConditionValue, LuceneValue} from "./LuceneValue";
import {EscapeQueryOption, EscapeQueryOptions} from "../Session/EscapeQueryOptions";

export class LuceneBuilder {
  protected static readonly emptyString = '[[EMPTY_STRING]]';
  protected static readonly nullValue = '[[NULL_VALUE]]';

  public static buildCondition<T extends LuceneConditionValue>(fieldName: string, value: T,
    operator?: LuceneOperator, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): string {
    const luceneText: string = this.escapeAndConvertValue<T>(value, operator, escapeQueryOptions);

    return luceneText;
  }

  protected static escapeAndConvertValue<T extends LuceneConditionValue>(value: T,
    operator?: LuceneOperator, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): string {
    return '';
  }

  protected static toLucene<T extends LuceneConditionValue>(value: T, operator: LuceneOperator): string {
    let queryText = '';

    switch (operator) {
      case LuceneOperators.In:
        (value as LuceneValue[]).map(()=>{});
        break;
      case LuceneOperators.Between:
        break;
      case LuceneOperators.EqualBetween:
        break;
      case LuceneOperators.Search:
        break;
    }

    return queryText;
  }

  protected static numericToLucene(value?: number): string {
    if (!value) {
      return (0 === value) ? this.emptyString : this.nullValue;
    }

    return value.toString();
  }
}