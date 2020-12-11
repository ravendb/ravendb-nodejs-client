
type OnlyNumbers<T> = { [ P in keyof T]: T[P] extends number ? P : never }[keyof T];

type MappedField<T> = { field: OnlyNumbers<T>, name: string };

export type TimeSeriesValue<T> = (OnlyNumbers<T> | MappedField<T>)[];
