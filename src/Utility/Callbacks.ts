export type AbstractCallback<T> = (entity?: T, error?: Error) => void;

export type EntityKeyCallback = AbstractCallback<string>;
export type QueryResultsCallback<T> = AbstractCallback<T>;
export type EntityCallback<T> = AbstractCallback<T>;
export type EntitiesArrayCallback<T> = AbstractCallback<T[]>;
export type EntitiesCountCallback = AbstractCallback<number>;
export type EmptyCallback = AbstractCallback<void>;
