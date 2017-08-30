export type RQLValue = string | number | boolean | Date | null;

export interface RQLRangeValue<T extends RQLValue> {
  min?: T,
  max?: T,
  orName?: T,
  orValue?: T
}

export type RQLConditionValue = RQLValue | RQLValue[] | RQLRangeValue<RQLValue>;