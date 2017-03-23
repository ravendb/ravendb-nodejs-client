export type LuceneValue = string | number | boolean | null;

export interface LuceneRangeValue {
  min?: LuceneValue,
  max?: LuceneValue
}

export type LuceneConditionValue = LuceneValue | LuceneValue[] | LuceneRangeValue;