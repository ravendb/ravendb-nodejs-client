export interface IChangesObservable<T> extends IObservable<T> {
    ensureSubscribedNow(): Promise<void>;
}

export interface IObservable<T> {
    on(event: "data", handler: (value: T) => void): this;

    on(event: "error", handler: (error: Error) => void): this;

    off(event: "data", handler: (value: T) => void): this;

    off(event: "error", handler: (error: Error) => void): this;

    removeListener(event: "data", handler: (value: T) => void): this;

    removeListener(event: "error", handler: (error: Error) => void): this;
}
