export type LuceneValue = string | number | boolean | Date | null;

export interface LuceneRangeValue<T extends LuceneValue> {
  min?: T,
  max?: T
}

export type LuceneConditionValue = LuceneValue | LuceneValue[] | LuceneRangeValue<LuceneValue>;