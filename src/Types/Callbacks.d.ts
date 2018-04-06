export declare type AbstractCallback<T> = (entity?: T, error?: Error) => void;
export declare type EntityIdCallback = AbstractCallback<string>;
export declare type QueryResultsCallback<T> = AbstractCallback<T>;
export declare type EntityCallback<T> = AbstractCallback<T>;
export declare type EntitiesArrayCallback<T> = AbstractCallback<T[]>;
export declare type EntitiesCountCallback = AbstractCallback<number>;
export declare type EmptyCallback = AbstractCallback<void>;
