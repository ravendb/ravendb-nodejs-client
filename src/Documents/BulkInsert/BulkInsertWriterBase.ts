import { IDisposable } from "../../Types/Contracts.js";
import { Buffer } from "node:buffer";
import { pipeline, Readable } from "node:stream";
import type { Gzip, ZstdCompress } from "node:zlib";
import { promisify } from "node:util";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { HttpCompressionAlgorithm } from "../../Http/HttpCompressionAlgorithm.js";
import { RuntimeUtil } from "../../Utility/RuntimeUtil.js";

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
    public compressedStream: Gzip | ZstdCompress;

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

                await this.writeToStream(this._currentWriter.toBuffers());
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

            const buffers = this._backgroundWriter.toBuffers();
            force = true; // original version: force || this.isHeartbeatIntervalExceeded() || ; in node.js we need to force flush to use backpressure in steams
            this._asyncWriteDone = false;
            this._asyncWrite = this.writeToStream(buffers, force);
        }
    }

    private _updateFlushTime(): void {
        this.lastFlushToStream = Date.now();
    }

    protected onCurrentWriteStreamSet(currentWriteStream: BulkInsertStream): void {
        // empty by design
    }

    private async writeToStream(buffers: Buffer[], forceDstFlush: boolean = false): Promise<void> {
        try {
            for (const buffer of buffers) {
                this.requestBodyStream.write(buffer);
            }

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

    public async ensureStream(compression: HttpCompressionAlgorithm): Promise<HttpCompressionAlgorithm> {
        if (compression) {
            const { createGzip, createZstdCompress } = await import("node:zlib");
            if (typeof createZstdCompress !== "function") {
                compression = "Gzip";
            }
            this.compressedStream = compression === "Zstd" ? createZstdCompress() : createGzip();
            pipeline(this.requestBodyStream, this.compressedStream, TypeUtil.NOOP);
        }

        this._currentWriter.push("[");
        return compression;
    }
}

export class BulkInsertStream {

    // copying a large attachment into the flushed buffer doubles its memory until GC
    private static readonly PASS_THROUGH_SIZE = 1024 * 1024;

    // Deno's fetch transfers each chunk's ArrayBuffer: a pooled buffer cannot be detached, and a passed-through
    // attachment would be detached from the caller
    private static readonly _transportKeepsBuffers = RuntimeUtil.supportsUndiciDispatcher();

    private readonly _items: Array<string | Buffer> = [];
    private totalLength = 0;
    private _hasPassThroughBuffer = false;

    public push(data: string | Buffer) {
        this._items.push(data);

        if (Buffer.isBuffer(data)) {
            this.totalLength += data.length;
            this._hasPassThroughBuffer ||= BulkInsertStream._isPassThrough(data);
        } else {
            this.totalLength += Buffer.byteLength(data);
        }
    }

    public toBuffers(): Buffer[] {
        if (!this._hasPassThroughBuffer) {
            return [BulkInsertStream._concat(this._items, this.totalLength)];
        }

        const buffers: Buffer[] = [];
        let pending: Array<string | Buffer> = [];
        let pendingLength = 0;

        for (const item of this._items) {
            if (BulkInsertStream._isPassThrough(item)) {
                if (pending.length) {
                    buffers.push(BulkInsertStream._concat(pending, pendingLength));
                    pending = [];
                    pendingLength = 0;
                }
                buffers.push(item);
            } else {
                pending.push(item);
                pendingLength += Buffer.isBuffer(item) ? item.length : Buffer.byteLength(item);
            }
        }

        if (pending.length) {
            buffers.push(BulkInsertStream._concat(pending, pendingLength));
        }

        return buffers;
    }

    private static _isPassThrough(item: string | Buffer): item is Buffer {
        return BulkInsertStream._transportKeepsBuffers
            && Buffer.isBuffer(item)
            && item.length >= BulkInsertStream.PASS_THROUGH_SIZE;
    }

    private static _concat(items: Array<string | Buffer>, length: number): Buffer {
        const result = BulkInsertStream._transportKeepsBuffers ? Buffer.allocUnsafe(length) : Buffer.allocUnsafeSlow(length);
        let idx = 0;
        for (const item of items) {
            if (Buffer.isBuffer(item)) {
                item.copy(result, idx);
                idx += item.length;
            } else {
                idx += result.write(item, idx);
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
