export type LuceneValue = string | number | boolean | null;

export interface LuceneRangeValue<T extends LuceneValue> {
  min?: T,
  max?: T
}

export type LuceneConditionValue = LuceneValue | LuceneValue[] | LuceneRangeValue<LuceneValue>;