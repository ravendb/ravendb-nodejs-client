export type AbstractCallback<TResult> = (error?: Error, result?: TResult) => void;
export type NodeCallback<TResult> = AbstractCallback<TResult>;

export type EntityIdCallback = AbstractCallback<string>;
export type QueryResultsCallback<T> = AbstractCallback<T>;
export type EntitiesCountCallback = AbstractCallback<number>;
export type EmptyCallback = AbstractCallback<void>;

export type ValueCallback<T> = (result: T) => void;
