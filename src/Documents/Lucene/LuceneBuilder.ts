import {LuceneOperator, LuceneOperators} from "./LuceneOperator";
import {LuceneConditionValue, LuceneValue, LuceneRangeValue} from "./LuceneValue";
import {EscapeQueryOption, EscapeQueryOptions} from "../Session/EscapeQueryOptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {DocumentConventions} from "../Conventions/DocumentConventions";
import {IDocument} from "../IDocument";

export class LuceneBuilder {
  protected static readonly emptyString = '[[EMPTY_STRING]]';
  protected static readonly nullValue = '[[NULL_VALUE]]';

  public static buildCondition<T extends LuceneConditionValue>(conventions: DocumentConventions<IDocument>,
    fieldName: string, value: T, operator?: LuceneOperator,
    escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): string {
    let luceneField: string = fieldName;
    let luceneText: string | null = this.escapeAndConvertValue<T>(value, operator, escapeQueryOptions);

    switch (operator) {
      case LuceneOperators.StartsWith:
      case LuceneOperators.EndsWith:
        if (!TypeUtil.isNone(value) && !TypeUtil.isString(value)) {
          luceneField = conventions.rangedFieldName(fieldName, value);
        }
        break;
      case LuceneOperators.Between:
      case LuceneOperators.EqualBetween:
        const rangedValue: LuceneRangeValue<LuceneValue> = value as LuceneRangeValue<LuceneValue>;
        const minOrMax: LuceneValue = rangedValue.min || rangedValue.max;

        if (conventions.usesRangeType(minOrMax) && !luceneField.endsWith('_Range')) {
          luceneField = conventions.rangedFieldName(fieldName, minOrMax);
        }
        break;
    }

    switch (operator) {
      case LuceneOperators.Search:
      case LuceneOperators.Equals:
      case LuceneOperators.Between:
      case LuceneOperators.EqualBetween:
        luceneText = StringUtil.format('{0}:{1}', luceneField, luceneText);
        break;
      case LuceneOperators.StartsWith:
        luceneText = StringUtil.format('{0}:{1}*', luceneField, luceneText);
        break;
      case LuceneOperators.EndsWith:
        luceneText = StringUtil.format('{0}:*{1}', luceneField, luceneText);
        break;
      case LuceneOperators.In:
        if (TypeUtil.isNone(luceneText)) {
          luceneText = StringUtil.format('@emptyIn<{0}>:(no-result)', luceneField);
        } else {
          luceneText = StringUtil.format('@in<{0}>:{1}', luceneField, luceneText);
        }
        break;
    }

    return luceneText as string;
  }

  protected static escapeAndConvertValue<T extends LuceneConditionValue>(value: T,
    operator?: LuceneOperator, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): string | null {
    let escapedValue: T = value;

    if (TypeUtil.isString(value)) {
      let escapedString: string = StringUtil.escape(escapedValue as string, false, false);

      switch (escapeQueryOptions) {
        case EscapeQueryOptions.AllowAllWildcards:
          escapedString = escapedString.replace(/"\\\*(\s|$)"/g, "*$1");
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
        const valueFormatter = (value: LuceneValue) => TypeUtil.isString(value)
          ? StringUtil.format('"{0}"', value) : value.toString();

        if (!inConditionValues || (0 === inConditionValues.length)) {
          return null;
        }

        queryText = StringUtil.format('({0})', inConditionValues.map(valueFormatter).join(', '));
        break;
      case LuceneOperators.Between:
      case LuceneOperators.EqualBetween:
        const conditionRange: LuceneRangeValue<LuceneValue> = value as LuceneRangeValue<LuceneValue>;
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
        if (TypeUtil.isString(value) && (value as string).includes(' ')) {
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