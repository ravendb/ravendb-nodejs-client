export interface TypedEventEmitter<TEvents, K = keyof TEvents | symbol> {
    addListener(event: K, listener: (...args: any[]) => void): this;

    on(event: K, listener: (...args: any[]) => void): this;

    once(event: K, listener: (...args: any[]) => void): this;

    removeListener(event: K, listener: (...args: any[]) => void): this;

    removeAllListeners(event?: K): this;

    setMaxListeners(n: number): this;

    getMaxListeners(): number;

    listeners(event: K): Function[];

    emit(event: K, ...args: any[]): boolean;

    listenerCount(type: K): number;

    // Added in Node 6...
    prependListener(event: K, listener: (...args: any[]) => void): this;

    prependOnceListener(event: K, listener: (...args: any[]) => void): this;
}
