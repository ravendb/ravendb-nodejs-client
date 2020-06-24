import { EventEmitter } from "events";

export interface TypedEventEmitter<TEvents> extends EventEmitter {
    addListener(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    on(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    off(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    once(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    removeListener(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    removeAllListeners(event?: string | keyof TEvents | symbol): this;

    setMaxListeners(n: number): this;

    getMaxListeners(): number;

    listeners(event: string | keyof TEvents | symbol): Function[];

    emit(event: string | keyof TEvents | symbol, ...args: any[]): boolean;

    listenerCount(type: string | keyof TEvents | symbol): number;

    // Added in Node 6...
    prependListener(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    prependOnceListener(event: string | keyof TEvents | symbol, listener: (...args: any[]) => void): this;

    rawListeners(event: string | keyof TEvents | symbol): Function[];

    eventNames(): (string | symbol)[];
}
