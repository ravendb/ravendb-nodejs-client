export type AbstractCallback<TResult> = (error?: Error, result?: TResult) => void;

export type EntityIdCallback = AbstractCallback<string>;
export type QueryResultsCallback<T> = AbstractCallback<T>;
export type EntitiesCountCallback = AbstractCallback<number>;
export type EmptyCallback = AbstractCallback<void>;
