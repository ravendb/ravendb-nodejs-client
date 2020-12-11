export type ErrorFirstCallback<TResult> = (error?: Error, result?: TResult) => void;

export type EmptyCallback = ErrorFirstCallback<void>;

export type ValueCallback<T> = (result: T) => void;
