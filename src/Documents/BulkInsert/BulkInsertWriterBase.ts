import { IDisposable } from "../../Types/Contracts.js";
import { Buffer } from "node:buffer";
import { pipeline, Readable } from "node:stream";
import type { Gzip } from "node:zlib";
import { promisify } from "node:util";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { HttpCompressionAlgorithm } from "../../Http/HttpCompressionAlgorithm.js";

export class BulkInsertWriterBase implements IDisposable {
    private readonly _maxSizeInBuffer = 1024 * 1024;

    private _asyncWrite: Promise<void> = Promise.resolve();
    private _asyncWriteDone: boolean = true;
    protected _currentWriter: BulkInsertStream;
    private _backgroundWriter: BulkInsertStream;
    private _isInitialWrite: boolean = true;

    public lastFlushToStream: number;

    public requestBodyStream: RequestBodyStream;
    public requestBodyStreamFinished: boolean = false;
    public compressedStream: Gzip;

    protected constructor() {
        this.requestBodyStream = new RequestBodyStream();

        this._currentWriter = new BulkInsertStream();
        this._backgroundWriter = new BulkInsertStream();

        this._updateFlushTime();
    }

    async dispose(): Promise<void> {
        if (this.requestBodyStreamFinished) {
            return;
        }

        try {
            if (this.requestBodyStream) {
                this._currentWriter.push("]");
                await this._asyncWrite;

                await this.writeToStream(this._currentWriter.toBuffer());
                await this.requestBodyStream.flush();
            }
        } finally {
            this.requestBodyStreamFinished = true;
        }
    }

    public initialize(): void {
        this.onCurrentWriteStreamSet(this._currentWriter);
    }

    public isFlushNeeded() {
        return this._currentWriter.length > this._maxSizeInBuffer || this._asyncWriteDone;
    }

    public async flushIfNeeded(force = false): Promise<void> {
        if (this.isFlushNeeded()) {
            await this._asyncWrite;

            const tmp = this._currentWriter;
            this._currentWriter = this._backgroundWriter;
            this._backgroundWriter = tmp;

            this._currentWriter = new BulkInsertStream();

            const buffer = this._backgroundWriter.toBuffer();
            force = true; // original version: force || this.isHeartbeatIntervalExceeded() || ; in node.js we need to force flush to use backpressure in steams
            this._asyncWriteDone = false;
            this._asyncWrite = this.writeToStream(buffer, force);
        }
    }

    private _updateFlushTime(): void {
        this.lastFlushToStream = Date.now();
    }

    protected onCurrentWriteStreamSet(currentWriteStream: BulkInsertStream): void {
        // empty by design
    }

    private async writeToStream(buffer: Buffer, forceDstFlush: boolean = false): Promise<void> {
        try {
            this.requestBodyStream.write(buffer);

            if (forceDstFlush) {
                this._updateFlushTime();
                await this.requestBodyStream.flush();
            }
            if (this.compressedStream) {
                const flush = promisify(this.compressedStream.flush);
                await flush.call(this.compressedStream);
            }
        } finally {
            this._asyncWriteDone = true;
        }
    }

    public async ensureStream(compression: HttpCompressionAlgorithm) {
        if (compression === "Gzip") {
            const { createGzip } = await import("node:zlib");
            this.compressedStream = createGzip();
            pipeline(this.requestBodyStream, this.compressedStream, TypeUtil.NOOP);
        }

        this._currentWriter.push("[");
    }
}

export class BulkInsertStream {

    private readonly _items: Array<string | Buffer> = [];
    private totalLength = 0;

    public push(data: string | Buffer) {
        this._items.push(data);
        this.totalLength += Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
    }

    public toBuffer(): Buffer {
        const result = Buffer.allocUnsafe(this.totalLength);
        let idx = 0;
        for (const inputElement of this._items) {
            if (Buffer.isBuffer(inputElement)) {
                inputElement.copy(result, idx);
                idx += inputElement.length;
            } else {
                result.write(inputElement, idx);
                idx += Buffer.byteLength(inputElement);
            }
        }

        return result;
    }

    public get length() {
        return this.totalLength;
    }
}

export class RequestBodyStream extends Readable {
    constructor() {
        super({
            highWaterMark: 1024 * 1024
        });
    }

    private _pending: Promise<void>;
    private _resume: () => void;

    _read(size: number) {
        this._resume?.();
    }

    write(data: Buffer | string) {
        const canConsumeMore = this.push(data);
        if (!canConsumeMore) {
            this._pending = new Promise(resolve => {
                this._resume = () => {
                    this._resume = null;
                    resolve();
                };
            });
        }
    }

    async flush(): Promise<void> {
        await this._pending;
    }
}
