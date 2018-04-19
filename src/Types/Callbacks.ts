export type AbstractCallback<T> = (error?: Error, entity?: T) => void;

export type EntityIdCallback = AbstractCallback<string>;
export type QueryResultsCallback<T> = AbstractCallback<T>;
export type EntityCallback<T> = AbstractCallback<T>;
export type EntitiesArrayCallback<T> = AbstractCallback<T[]>;
export type EntitiesCountCallback = AbstractCallback<number>;
export type EmptyCallback = AbstractCallback<void>;
