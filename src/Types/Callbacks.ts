export type ErrorFirstCallback<TResult> = (error?: Error, result?: TResult) => void;
export type NodeCallback<TResult> = ErrorFirstCallback<TResult>;

export type EntityIdCallback = ErrorFirstCallback<string>;
export type QueryResultsCallback<T> = ErrorFirstCallback<T>;
export type EntitiesCountCallback = ErrorFirstCallback<number>;
export type EmptyCallback = ErrorFirstCallback<void>;

export type ValueCallback<T> = (result: T) => void;
