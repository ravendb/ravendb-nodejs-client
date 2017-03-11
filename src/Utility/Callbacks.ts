export type AbstractCallback<T> = (entity?: T, error?: Error) => void;

export type EntityCallback<T> = AbstractCallback<T>;
export type EntitiesArrayCallback<T> = AbstractCallback<T[]>;
export type EntitiesCountCallback = AbstractCallback<number>;