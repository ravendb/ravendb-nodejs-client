import {LuceneOperator, LuceneOperators} from "./LuceneOperator";
import {LuceneConditionValue, LuceneValue, LuceneRangeValue} from "./LuceneValue";
import {EscapeQueryOption, EscapeQueryOptions} from "../Session/EscapeQueryOptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";

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
    let escapedValue: T = value;

    if ('string' == (typeof value)) {
      let escapedString = StringUtil.escape(escapedValue as string, false, false);

      switch (escapeQueryOptions) {
        case EscapeQueryOptions.AllowAllWildcards:
          //TODO: escapedString = re.sub(r'"\\\*(\s|$)"', "*${1}", escapedString)
          break;
        case EscapeQueryOptions.RawQuery:
          escapedString = escapedString.replace('\\\\*', '*');
          break;
      }

      escapedValue = (escapedValue as T);
    }

    return this.toLucene(escapedValue, operator);
  }

  protected static toLucene<T extends LuceneConditionValue>(value: T, operator: LuceneOperator): string | null {
    let queryText = '';

    switch (operator) {
      case LuceneOperators.In:
        const inConditionValues: LuceneValue[] = value as LuceneValue[];
        const valueFormatter = (value: LuceneValue) => ('string' === (typeof value))
          ? StringUtil.format('"{0}"', value) : value.toString();

        if (!inConditionValues || (0 === inConditionValues.length)) {
          return null;
        }

        queryText = StringUtil.format('({0})', inConditionValues.map(valueFormatter).join(', '));
        break;
      case LuceneOperators.Between:
      case LuceneOperators.EqualBetween:
        const conditionRange = value as LuceneRangeValue;
        const conditionTemplate = (operator === LuceneOperators.EqualBetween)
          ? '[{0} TO {1}]' : '{{{0} TO {1}}}';

        queryText = StringUtil.format(conditionTemplate,
          this.valueToLuceneSyntax(conditionRange.min, '*'),
          this.valueToLuceneSyntax(conditionRange.max, 'NULL')
        );
        break;
      case LuceneOperators.Search:
        queryText = StringUtil.format('({0})', (value as LuceneValue).toString());
        break;
      default:
        if (('string' === typeof(value)) && (value as string).includes(' ')) {
          queryText = StringUtil.format('"{0}"', value as string);
        } else {
          queryText = TypeUtil.isNone(value) ? this.nullValue : value.toString();
        }
        break;
    }

    return queryText;
  }

  protected static valueToLuceneSyntax(value?: LuceneValue, nullString: string = '*'): string {
    if (TypeUtil.isNone(value)) {
      return nullString;
    }

    const stringValue = value.toString();

    return ('' == stringValue) ? this.emptyString : stringValue;
  }
}