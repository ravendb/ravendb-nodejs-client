/* eslint-disable @typescript-eslint/ban-types */
declare module "readable-stream";

declare module "readable-stream" {
    import * as events from "events";

    // tslint:disable-next-line:class-name
    class pipeable extends events.EventEmitter {
        public pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;
    }

    namespace pipeable {
        export class Stream extends pipeable {
        }

        export interface ReadableOptions {
            highWaterMark?: number;
            encoding?: string;
            objectMode?: boolean;
            read?: (this: Readable, size?: number) => any;
            destroy?: (error?: Error) => any;
        }

        export class Readable extends Stream implements NodeJS.ReadableStream {
            public readable: boolean;
            public readonly readableHighWaterMark: number;
            public readonly readableLength: number;

            constructor(opts?: ReadableOptions);

            // tslint:disable-next-line:function-name
            public _read(size: number): void;

            public read(size?: number): any;

            public setEncoding(encoding: string): this;

            public pause(): this;

            public resume(): this;

            public isPaused(): boolean;

            public unpipe<T extends NodeJS.WritableStream>(destination?: T): this;

            public unshift(chunk: any): void;

            public wrap(oldStream: NodeJS.ReadableStream): this;

            public push(chunk: any, encoding?: string): boolean;

            // tslint:disable-next-line:function-name
            public _destroy(err: Error, callback: Function): void;

            public destroy(error?: Error): void;

            /**
             * Event emitter
             * The defined events on documents including:
             * 1. close
             * 2. data
             * 3. end
             * 4. readable
             * 5. error
             */
            public addListener(event: string, listener: (...args: any[]) => void): this;
            public addListener(event: "close", listener: () => void): this;
            public addListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            public addListener(event: "end", listener: () => void): this;
            public addListener(event: "readable", listener: () => void): this;
            public addListener(event: "error", listener: (err: Error) => void): this;

            public emit(event: string | symbol, ...args: any[]): boolean;
            public emit(event: "close"): boolean;
            public emit(event: "data", chunk: Buffer | string): boolean;
            public emit(event: "end"): boolean;
            public emit(event: "readable"): boolean;
            public emit(event: "error", err: Error): boolean;

            public on(event: string, listener: (...args: any[]) => void): this;
            public on(event: "close", listener: () => void): this;
            public on(event: "data", listener: (chunk: Buffer | string) => void): this;
            public on(event: "end", listener: () => void): this;
            public on(event: "readable", listener: () => void): this;
            public on(event: "error", listener: (err: Error) => void): this;

            public once(event: string, listener: (...args: any[]) => void): this;
            public once(event: "close", listener: () => void): this;
            public once(event: "data", listener: (chunk: Buffer | string) => void): this;
            public once(event: "end", listener: () => void): this;
            public once(event: "readable", listener: () => void): this;
            public once(event: "error", listener: (err: Error) => void): this;

            public prependListener(event: string, listener: (...args: any[]) => void): this;
            public prependListener(event: "close", listener: () => void): this;
            public prependListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            public prependListener(event: "end", listener: () => void): this;
            public prependListener(event: "readable", listener: () => void): this;
            public prependListener(event: "error", listener: (err: Error) => void): this;

            public prependOnceListener(event: string, listener: (...args: any[]) => void): this;
            public prependOnceListener(event: "close", listener: () => void): this;
            public prependOnceListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            public prependOnceListener(event: "end", listener: () => void): this;
            public prependOnceListener(event: "readable", listener: () => void): this;
            public prependOnceListener(event: "error", listener: (err: Error) => void): this;

            public removeListener(event: string, listener: (...args: any[]) => void): this;
            public removeListener(event: "close", listener: () => void): this;
            public removeListener(event: "data", listener: (chunk: Buffer | string) => void): this;
            public removeListener(event: "end", listener: () => void): this;
            public removeListener(event: "readable", listener: () => void): this;
            public removeListener(event: "error", listener: (err: Error) => void): this;

            // tslint:disable:function-name
            public [Symbol.asyncIterator](): AsyncIterableIterator<Buffer | string>;
            // tslint:enable:function-name
        }

        export interface WritableOptions {
            highWaterMark?: number;
            decodeStrings?: boolean;
            objectMode?: boolean;
            write?: (chunk: any, encoding: string, callback: Function) => any;
            writev?: (chunks: { chunk: any, encoding: string }[], callback: Function) => any;
            destroy?: (error?: Error) => any;
            final?: (callback: (error?: Error) => void) => void;
        }

        export class Writable extends Stream implements NodeJS.WritableStream {
            public writable: boolean;
            public readonly writableHighWaterMark: number;
            public readonly writableLength: number;

            constructor(opts?: WritableOptions);

            // tslint:disable-next-line:function-name
            public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void;

            // tslint:disable-next-line:function-name
            public _writev?(chunks: { chunk: any, encoding: string }[], callback: (err?: Error) => void): void;

            // tslint:disable-next-line:function-name
            public _destroy(err: Error, callback: Function): void;

            // tslint:disable-next-line:function-name
            public _final(callback: Function): void;

            public write(chunk: any, cb?: Function): boolean;
            public write(chunk: any, encoding?: string, cb?: Function): boolean;

            public setDefaultEncoding(encoding: string): this;

            public end(cb?: Function): void;
            public end(chunk: any, cb?: Function): void;
            public end(chunk: any, encoding?: string, cb?: Function): void;

            public cork(): void;

            public uncork(): void;

            public destroy(error?: Error): void;

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
            public addListener(event: string, listener: (...args: any[]) => void): this;
            public addListener(event: "close", listener: () => void): this;
            public addListener(event: "drain", listener: () => void): this;
            public addListener(event: "error", listener: (err: Error) => void): this;
            public addListener(event: "finish", listener: () => void): this;
            public addListener(event: "pipe", listener: (src: Readable) => void): this;
            public addListener(event: "unpipe", listener: (src: Readable) => void): this;

            public emit(event: string | symbol, ...args: any[]): boolean;
            public emit(event: "close"): boolean;
            public emit(event: "drain", chunk: Buffer | string): boolean;
            public emit(event: "error", err: Error): boolean;
            public emit(event: "finish"): boolean;
            public emit(event: "pipe", src: Readable): boolean;
            public emit(event: "unpipe", src: Readable): boolean;

            public on(event: string, listener: (...args: any[]) => void): this;
            public on(event: "close", listener: () => void): this;
            public on(event: "drain", listener: () => void): this;
            public on(event: "error", listener: (err: Error) => void): this;
            public on(event: "finish", listener: () => void): this;
            public on(event: "pipe", listener: (src: Readable) => void): this;
            public on(event: "unpipe", listener: (src: Readable) => void): this;

            public once(event: string, listener: (...args: any[]) => void): this;
            public once(event: "close", listener: () => void): this;
            public once(event: "drain", listener: () => void): this;
            public once(event: "error", listener: (err: Error) => void): this;
            public once(event: "finish", listener: () => void): this;
            public once(event: "pipe", listener: (src: Readable) => void): this;
            public once(event: "unpipe", listener: (src: Readable) => void): this;

            public prependListener(event: string, listener: (...args: any[]) => void): this;
            public prependListener(event: "close", listener: () => void): this;
            public prependListener(event: "drain", listener: () => void): this;
            public prependListener(event: "error", listener: (err: Error) => void): this;
            public prependListener(event: "finish", listener: () => void): this;
            public prependListener(event: "pipe", listener: (src: Readable) => void): this;
            public prependListener(event: "unpipe", listener: (src: Readable) => void): this;

            public prependOnceListener(event: string, listener: (...args: any[]) => void): this;
            public prependOnceListener(event: "close", listener: () => void): this;
            public prependOnceListener(event: "drain", listener: () => void): this;
            public prependOnceListener(event: "error", listener: (err: Error) => void): this;
            public prependOnceListener(event: "finish", listener: () => void): this;
            public prependOnceListener(event: "pipe", listener: (src: Readable) => void): this;
            public prependOnceListener(event: "unpipe", listener: (src: Readable) => void): this;

            public removeListener(event: string, listener: (...args: any[]) => void): this;
            public removeListener(event: "close", listener: () => void): this;
            public removeListener(event: "drain", listener: () => void): this;
            public removeListener(event: "error", listener: (err: Error) => void): this;
            public removeListener(event: "finish", listener: () => void): this;
            public removeListener(event: "pipe", listener: (src: Readable) => void): this;
            public removeListener(event: "unpipe", listener: (src: Readable) => void): this;
        }

        export interface DuplexOptions extends ReadableOptions, WritableOptions {
            allowHalfOpen?: boolean;
            readableObjectMode?: boolean;
            writableObjectMode?: boolean;
        }

        // Note: Duplex extends both Readable and Writable.
        export class Duplex extends Readable implements Writable {
            public writable: boolean;
            public readonly writableHighWaterMark: number;
            public readonly writableLength: number;

            constructor(opts?: DuplexOptions);

            // tslint:disable-next-line:function-name
            public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void;

            // tslint:disable-next-line:function-name
            public _writev?(chunks: { chunk: any, encoding: string }[], callback: (err?: Error) => void): void;

            // tslint:disable-next-line:function-name
            public _destroy(err: Error, callback: Function): void;

            // tslint:disable-next-line:function-name
            public _final(callback: Function): void;

            public write(chunk: any, cb?: Function): boolean;
            public write(chunk: any, encoding?: string, cb?: Function): boolean;

            public setDefaultEncoding(encoding: string): this;

            public end(cb?: Function): void;
            public end(chunk: any, cb?: Function): void;
            public end(chunk: any, encoding?: string, cb?: Function): void;

            public cork(): void;

            public uncork(): void;
        }

        type TransformCallback = (err?: Error, data?: any) => void;

        export interface TransformOptions extends DuplexOptions {
            transform?: (chunk: any, encoding: string, callback: TransformCallback) => any;
            flush?: (callback: TransformCallback) => any;
        }

        export class Transform extends Duplex {
            constructor(opts?: TransformOptions);

            // tslint:disable-next-line:function-name
            public _transform(chunk: any, encoding: string, callback: TransformCallback): void;

            public destroy(error?: Error): void;
        }

        export class PassThrough extends Transform {
        }

        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: NodeJS.ReadWriteStream, stream5: T, callback?: (err: NodeJS.ErrnoException) => void): T;
        export function pipeline(streams: (NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream)[], callback?: (err: NodeJS.ErrnoException) => void): NodeJS.WritableStream;
        export function pipeline(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream | NodeJS.WritableStream, ...streams: (NodeJS.ReadWriteStream | NodeJS.WritableStream | ((err: NodeJS.ErrnoException) => void))[]): NodeJS.WritableStream;

        export namespace pipeline {
            // tslint:disable:function-name
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: T): Promise<void>;
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: T): Promise<void>;
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: T): Promise<void>;
            export function __promisify__<T extends NodeJS.WritableStream>(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream, stream3: NodeJS.ReadWriteStream, stream4: NodeJS.ReadWriteStream, stream5: T): Promise<void>;
            export function __promisify__(streams: (NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream)[]): Promise<void>;
            export function __promisify__(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadWriteStream | NodeJS.WritableStream, ...streams: (NodeJS.ReadWriteStream | NodeJS.WritableStream)[]): Promise<void>;
            // tslint:enable:function-name
        }

        export function finished(stream: pipeable.Stream, callback: (err?: Error) => void);
    }

    export = pipeable;
}
