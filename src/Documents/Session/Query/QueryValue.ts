export type QueryValue = string | number | boolean | Date | null;

export interface QueryRangeValue<T extends QueryValue> {
  min?: T,
  max?: T
}

export type RQLConditionValue = QueryValue | QueryValue[] | QueryRangeValue<QueryValue>;