export interface IChangesObservable<T> extends IObservable<T> {
    ensureSubscribedNow(): Promise<void>;
}

export interface IObservable<T> {
    on(event: "data", handler: (value: T) => void);

    on(event: "error", handler: (error: Error) => void);

    off(event: "data", handler: (value: T) => void);

    off(event: "error", handler: (error: Error) => void);

    removeListener(event: "data", handler: (value: T) => void);

    removeListener(event: "error", handler: (error: Error) => void);
}
