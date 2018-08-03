declare module 'readable-stream';

declare module 'readable-stream' {
    import * as events from "events";

    class pipeable extends events.EventEmitter {
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;
    }

    namespace pipeable {
        export class Stream extends pipeable { }

        export interface ReadableOptions {
            highWaterMark?: number;
            encoding?: string;
            objectMode?: boolean;
            read?: (this: Readable, size?: number) => any;
            destroy?: (error?: Error) => any;
        }

        export class Readable extends Stream implements NodeJS.ReadableStream {
            readable: boolean;
            readonly readableHighWaterMark: number;
            readonly readableLength: number;
            constructor(opts?: ReadableOptions);
            _read(size: number): void;
            read(size?: number): any;
            setEncoding(encoding: string): this;
            pause(): this;
            resume(): this;
            isPaused(): boolean;
            unpipe<T extends NodeJS.WritableStream>(destination?: T): this;
            unshift(chunk: any): void;
            wrap(oldStream: NodeJS.ReadableStream): this;
            push(chunk: any, encoding?: string): boolean;
            _destroy(err: Error, callback: Function): void;
            destroy(error?: Error): void;

            /**
             * Event emitter
             * The defined events on documents including:
             * 1. close
             * 2. data
             * 3. end
             * 4. readable
             * 5. error
             */
            addListener(event: string, listener: (...args: any[]) => void): this;
            addListener(event: "close", listener: () => void): this;
            addListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            addListener(event: "end", listener: () => void): this;
            addListener(event: "readable", listener: () => void): this;
            addListener(event: "error", listener: (err: Error) => void): this;

            emit(event: string | symbol, ...args: any[]): boolean;
            emit(event: "close"): boolean;
            emit(event: "data", chunk: Buffer | string): boolean;
            emit(event: "end"): boolean;
            emit(event: "readable"): boolean;
            emit(event: "error", err: Error): boolean;

            on(event: string, listener: (...args: any[]) => void): this;
            on(event: "close", listener: () => void): this;
            on(event: "data", listener: (chunk: Buffer | string) => void): this;
            on(event: "end", listener: () => void): this;
            on(event: "readable", listener: () => void): this;
            on(event: "error", listener: (err: Error) => void): this;

            once(event: string, listener: (...args: any[]) => void): this;
            once(event: "close", listener: () => void): this;
            once(event: "data", listener: (chunk: Buffer | string) => void): this;
            once(event: "end", listener: () => void): this;
            once(event: "readable", listener: () => void): this;
            once(event: "error", listener: (err: Error) => void): this;

            prependListener(event: string, listener: (...args: any[]) => void): this;
            prependListener(event: "close", listener: () => void): this;
            prependListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            prependListener(event: "end", listener: () => void): this;
            prependListener(event: "readable", listener: () => void): this;
            prependListener(event: "error", listener: (err: Error) => void): this;

            prependOnceListener(event: string, listener: (...args: any[]) => void): this;
            prependOnceListener(event: "close", listener: () => void): this;
            prependOnceListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            prependOnceListener(event: "end", listener: () => void): this;
            prependOnceListener(event: "readable", listener: () => void): this;
            prependOnceListener(event: "error", listener: (err: Error) => void): this;

            removeListener(event: string, listener: (...args: any[]) => void): this;
            removeListener(event: "close", listener: () => void): this;
            removeListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            removeListener(event: "end", listener: () => void): this;
            removeListener(event: "readable", listener: () => void): this;
            removeListener(event: "error", listener: (err: Error) => void): this;

            [Symbol.asyncIterator](): AsyncIterableIterator<Buffer | string>;
        }

        export interface WritableOptions {
            highWaterMark?: number;
            decodeStrings?: boolean;
            objectMode?: boolean;
            write?: (chunk: any, encoding: string, callback: Function) => any;
            writev?: (chunks: Array<{ chunk: any, encoding: string }>, callback: Function) => any;
            destroy?: (error?: Error) => any;
            final?: (callback: (error?: Error) => void) => void;
        }

        export class Writable extends Stream implements NodeJS.WritableStream {
            writable: boolean;
            readonly writableHighWaterMark: number;
            readonly writableLength: number;
            constructor(opts?: WritableOptions);
            _write(chunk: any, encoding: string, callback: (err?: Error) => void): void;
            _writev?(chunks: Array<{ chunk: any, encoding: string }>, callback: (err?: Error) => void): void;
            _destroy(err: Error, callback: Function): void;
            _final(callback: Function): void;
            write(chunk: any, cb?: Function): boolean;
            write(chunk: any, encoding?: string, cb?: Function): boolean;
            setDefaultEncoding(encoding: string): this;
            end(cb?: Function): void;
            end(chunk: any, cb?: Function): void;
            end(chunk: any, encoding?: string, cb?: Function): void;
            cork(): void;
            uncork(): void;
            destroy(error?: Error): void;

            /**
             * Event emitter
             * The defined events on documents including:
             * 1. close
             * 2. drain
             * 3. error
             * 4. finish
             * 5. pipe
             * 6. unpipe
             */
            addListener(event: string, listener: (...args: any[]) => void): this;
            addListener(event: "close", listener: () => void): this;
            addListener(event: "drain", listener: () => void): this;
            addListener(event: "error", listener: (err: Error) => void): this;
            addListener(event: "finish", listener: () => void): this;
            addListener(event: "pipe", listener: (src: Readable) => void): this;
            addListener(event: "unpipe", listener: (src: Readable) => void): this;

            emit(event: string | symbol, ...args: any[]): boolean;
            emit(event: "close"): boolean;
            emit(event: "drain", chunk: Buffer | string): boolean;
            emit(event: "error", err: Error): boolean;
            emit(event: "finish"): boolean;
            emit(event: "pipe", src: Readable): boolean;
            emit(event: "unpipe", src: Readable): boolean;

            on(event: string, listener: (...args: any[]) => void): this;
            on(event: "close", listener: () => void): this;
            on(event: "drain", listener: () => void): this;
            on(event: "error", listener: (err: Error) => void): this;
            on(event: "finish", listener: () => void): this;
            on(event: "pipe", listener: (src: Readable) => void): this;
            on(event: "unpipe", listener: (src: Readable) => void): this;

            once(event: string, listener: (...args: any[]) => void): this;
            once(event: "close", listener: () => void): this;
            once(event: "drain", listener: () => void): this;
            once(event: "error", listener: (err: Error) => void): this;
            once(event: "finish", listener: () => void): this;
            once(event: "pipe", listener: (src: Readable) => void): this;
            once(event: "unpipe", listener: (src: Readable) => void): this;

            prependListener(event: string, listener: (...args: any[]) => void): this;
            prependListener(event: "close", listener: () => void): this;
            prependListener(event: "drain", listener: () => void): this;
            prependListener(event: "error", listener: (err: Error) => void): this;
            prependListener(event: "finish", listener: () => void): this;
            prependListener(event: "pipe", listener: (src: Readable) => void): this;
            prependListener(event: "unpipe", listener: (src: Readable) => void): this;

            prependOnceListener(event: string, listener: (...args: any[]) => void): this;
            prependOnceListener(event: "close", listener: () => void): this;
            prependOnceListener(event: "drain", listener: () => void): this;
            prependOnceListener(event: "error", listener: (err: Error) => void): this;
            prependOnceListener(event: "finish", listener: () => void): this;
            prependOnceListener(event: "pipe", listener: (src: Readable) => void): this;
            prependOnceListener(event: "unpipe", listener: (src: Readable) => void): this;

            removeListener(event: string, listener: (...args: any[]) => void): this;
            removeListener(event: "close", listener: () => void): this;
            removeListener(event: "drain", listener: () => void): this;
            removeListener(event: "error", listener: (err: Error) => void): this;
            removeListener(event: "finish", listener: () => void): this;
            removeListener(event: "pipe", listener: (src: Readable) => void): this;
            removeListener(event: "unpipe", listener: (src: Readable) => void): this;
        }

        export interface DuplexOptions extends ReadableOptions, WritableOptions {
            allowHalfOpen?: boolean;
            readableObjectMode?: boolean;
            writableObjectMode?: boolean;
        }

        // Note: Duplex extends both Readable and Writable.
        export class Duplex extends Readable implements Writable {
            writable: boolean;
            readonly writableHighWaterMark: number;
            readonly writableLength: number;
            constructor(opts?: DuplexOptions);
            _write(chunk: any, encoding: string, callback: (err?: Error) => void): void;
            _writev?(chunks: Array<{ chunk: any, encoding: string }>, callback: (err?: Error) => void): void;
            _destroy(err: Error, callback: Function): void;
            _final(callback: Function): void;
            write(chunk: any, cb?: Function): boolean;
            write(chunk: any, encoding?: string, cb?: Function): boolean;
            setDefaultEncoding(encoding: string): this;
            end(cb?: Function): void;
            end(chunk: any, cb?: Function): void;
            end(chunk: any, encoding?: string, cb?: Function): void;
            cork(): void;
            uncork(): void;
        }

        type TransformCallback = (err?: Error, data?: any) => void;

        export interface TransformOptions extends DuplexOptions {
            transform?: (chunk: any, encoding: string, callback: TransformCallback) => any;
            flush?: (callback: TransformCallback) => any;
        }

        export class Transform extends Duplex {
            constructor(opts?: TransformOptions);
            _transform(chunk: any, encoding: string, callback: TransformCallback): void;
            destroy(error?: Error): void;
        }

        export class PassThrough extends Transform { }

        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: NodeJS.ReadWriteStream, stream5: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline(streams: Array<NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream>, callback?: (err: NodeJS.ErrnoException) => void): NodeJS.WritableStream;
        export function pipeline(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream | NodeJS.WritableStream, ...streams: Array<NodeJS.ReadWriteStream | NodeJS.WritableStream | ((err: NodeJS.ErrnoException) => void)>): NodeJS.WritableStream;
        export namespace pipeline {
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: T): Promise<void>;
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: T): Promise<void>;
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: T): Promise<void>;
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: NodeJS.ReadWriteStream, stream5: T): Promise<void>;
            export function __promisify__(streams: Array<NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream>): Promise<void>;
            export function __promisify__(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream | NodeJS.WritableStream, ...streams: Array<NodeJS.ReadWriteStream | NodeJS.WritableStream>): Promise<void>;
        }

        export function finished(stream: pipeable.Stream, callback: (err?: Error) => {});
    }

    export = pipeable;
}