import { EventEmitter } from "events";
import * as Parser from "stream-json/Parser";
import {
    ObjectKeyCaseTransformStreamOptions,
    ObjectKeyCaseTransformStream
} from "../Mapping/Json/Streams/ObjectKeyCaseTransformStream";
import {
    ObjectKeyCaseTransformProfile,
    getObjectKeyCaseTransformProfile
} from "../Mapping/Json/Conventions";
import { CasingConvention } from "../Utility/ObjectUtil";
import * as StreamUtil from "../Utility/StreamUtil";
import * as stream from "readable-stream";
import {
    CollectResultStream,
    CollectResultStreamOptions,
    lastChunk
} from "../Mapping/Json/Streams/CollectResultStream";
import { throwError, getError } from "../Exceptions";
import {
    TransformJsonKeysStreamOptions,
    TransformKeysJsonStream
} from "../Mapping/Json/Streams/TransformKeysJsonStream";
import {
    getTransformJsonKeysProfile,
    TransformJsonKeysProfile
} from "../Mapping/Json/Streams/TransformJsonKeysProfiles";
import { TypeUtil } from "../Utility/TypeUtil";
import * as Asm from "stream-json/Assembler";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";
import { ErrorFirstCallback } from "../Types/Callbacks";
import { StringBuilder } from "../Utility/StringBuilder";
import { parser as jsonlParser } from "stream-json/jsonl/Parser";

export interface RavenCommandResponsePipelineOptions<TResult> {
    collectBody?: boolean | ((body: string) => void);
    jsonAsync?: {
        filters: any[]
    };
    jsonlAsync?: {
        transforms: stream.Transform[]
    };
    jsonSync?: boolean;
    streamKeyCaseTransform?: ObjectKeyCaseTransformStreamOptions;
    collectResult: CollectResultStreamOptions<TResult>;
    transform?: stream.Stream;
    transformKeys?: TransformJsonKeysStreamOptions;
}

export class RavenCommandResponsePipeline<TStreamResult> extends EventEmitter {

    private readonly _opts: RavenCommandResponsePipelineOptions<TStreamResult>;
    private _body: StringBuilder = new StringBuilder();

    private constructor() {
        super();
        this._opts = {} as RavenCommandResponsePipelineOptions<TStreamResult>;
    }

    public static create<TResult>(): RavenCommandResponsePipeline<TResult> {
        return new RavenCommandResponsePipeline();
    }

    public parseJsonAsync(filters?: any[]) {
        this._opts.jsonAsync = { filters };
        return this;
    }

    public parseJsonSync() {
        this._opts.jsonSync = true;
        return this;
    }

    public parseJsonlAsync(type: "Item" | "Stats", options: { transforms?: stream.Transform[] } = {}) {
        const extractItemTransform = new stream.Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                const value = chunk["value"][type];
                if (!value) {
                    return callback();
                }

                callback(null, {...chunk, value});
            }
        });

        this._opts.jsonlAsync = {
            transforms: [ extractItemTransform, ...options?.transforms ?? [] ],
        };
        return this;
    }

    public collectBody(callback?: (body: string) => void) {
        this._opts.collectBody = callback || true;
        return this;
    }

    public jsonKeysTransform(): this;
    public jsonKeysTransform(profile: TransformJsonKeysProfile, conventions: DocumentConventions): this;
    public jsonKeysTransform(profile: TransformJsonKeysProfile): this;
    public jsonKeysTransform(opts: TransformJsonKeysStreamOptions): this;
    public jsonKeysTransform(
        optsOrProfile?: TransformJsonKeysStreamOptions | TransformJsonKeysProfile,
        conventions?: DocumentConventions): this {

        if (!this._opts.jsonAsync) {
            throwError("InvalidOperationException",
                "Cannot use transformKeys without doing parseJsonAsync() first.");
        }

        if (!optsOrProfile) {
            throwError("InvalidArgumentException", "Must provide transform opts or profile name.");
        }

        if (TypeUtil.isString(optsOrProfile)) {
            this._opts.transformKeys = getTransformJsonKeysProfile(optsOrProfile, conventions);
        } else {
            this._opts.transformKeys = optsOrProfile;
        }

        return this;
    }

    public objectKeysTransform(defaultTransform: CasingConvention, profile?: ObjectKeyCaseTransformProfile): this;
    public objectKeysTransform(opts: ObjectKeyCaseTransformStreamOptions): this;
    public objectKeysTransform(
        optsOrTransform: CasingConvention | ObjectKeyCaseTransformStreamOptions,
        profile?: ObjectKeyCaseTransformProfile): this {

        if (!this._opts.jsonAsync && !this._opts.jsonSync) {
            throwError("InvalidOperationException",
                "Cannot use key case transform without doing parseJson() or parseJsonAsync() first.");
        }

        if (!optsOrTransform || typeof optsOrTransform === "string") {
            this._opts.streamKeyCaseTransform =
                getObjectKeyCaseTransformProfile(optsOrTransform as CasingConvention, profile);
        } else {
            this._opts.streamKeyCaseTransform = optsOrTransform;
        }

        if (this._opts.jsonAsync) {
            this._opts.streamKeyCaseTransform.handleKeyValue = true;
        }

        return this;
    }

    public collectResult(
        reduce: (result: TStreamResult, next: object) => TStreamResult,
        init: TStreamResult): RavenCommandResponsePipeline<TStreamResult>;
    public collectResult(opts: CollectResultStreamOptions<TStreamResult>): RavenCommandResponsePipeline<TStreamResult>;
    public collectResult(
        optsOrReduce:
            CollectResultStreamOptions<TStreamResult> | ((result: TStreamResult, next: object) => TStreamResult),
        init?: TStreamResult): RavenCommandResponsePipeline<TStreamResult> {
        if (typeof optsOrReduce === "function") {
            this._opts.collectResult = { reduceResults: optsOrReduce, initResult: init };
        } else {
            this._opts.collectResult = optsOrReduce;
        }

        return this;
    }

    public stream(src: stream.Stream): stream.Readable;
    public stream(src: stream.Stream, dst: stream.Writable, callback: ErrorFirstCallback<void>): stream.Stream;
    public stream(src: stream.Stream, dst?: stream.Writable, callback?: ErrorFirstCallback<void>): stream.Stream {
        const streams = this._buildUp(src);
        if (dst) {
            streams.push(dst);
        }

        return (stream.pipeline as any)(...streams, TypeUtil.NOOP) as stream.Stream; //TODO: remove noop?
    }

    private _appendBody(s: Buffer | string): void {
        this._body.append(s.toString());
    }

    private _buildUp(src: stream.Stream) {
        if (!src) {
            throwError("MappingError", "Body stream cannot be null.");
        }

        const opts = this._opts;
        const streams: stream.Stream[] = [src];
        if (opts.collectBody) {
            src.on("data", (chunk: Buffer | string) => this._appendBody(chunk));
        }

        if (opts.jsonAsync) {
            const parser = new Parser({ streamValues: false });
            streams.push(parser);

            if (opts.jsonAsync.filters && opts.jsonAsync.filters.length) {
                streams.push(...opts.jsonAsync.filters);
            }
        } else if (opts.jsonlAsync) {
            streams.push(jsonlParser());

            if (opts.jsonlAsync.transforms) {
                streams.push(...opts.jsonlAsync.transforms);
            }
        } else if (opts.jsonSync) {
            const bytesChunks = [];
            const parseJsonSyncTransform = new stream.Transform({
                readableObjectMode: true,
                transform(chunk, enc, callback) {
                    bytesChunks.push(chunk);
                    callback();
                },
                flush(callback) {
                    let str = null;
                    try {
                        str = Buffer.concat(bytesChunks).toString('utf-8');
                    } catch(err){
                        callback(
                            getError("InvalidDataException", `Failed to concat / decode server response`, err));
                        return;
                    }
                    try {
                        callback(null, JSON.parse(str));
                    } catch (err) {
                        callback(
                            getError("InvalidOperationException", `Error parsing response: '${str}'.`, err));
                    }
                }
            });
            streams.push(parseJsonSyncTransform);
        }

        if (opts.streamKeyCaseTransform) {
            const handlePath = !!opts.jsonAsync;
            const keyCaseOpts = Object.assign({}, opts.streamKeyCaseTransform, { handlePath });
            streams.push(new ObjectKeyCaseTransformStream(keyCaseOpts));
        }

        if (opts.transformKeys) {
            streams.push(new TransformKeysJsonStream(opts.transformKeys) as any);
        }

        return streams;
    }

    public process(src: stream.Stream): Promise<TStreamResult> {
        const streams = this._buildUp(src);
        const opts = this._opts;
        let resultPromise: Promise<TStreamResult>;
        if (opts.jsonAsync) {
            const asm = Asm.connectTo(streams[streams.length - 1] as any);
            resultPromise = new Promise(resolve => {
                asm.on("done", asm => resolve(asm.current));
            });
        } else {
            const collectResultOpts = !opts.collectResult || !opts.collectResult.reduceResults
                ? { reduceResults: lastChunk as any } : opts.collectResult;
            const collectResult = new CollectResultStream(collectResultOpts);
            streams.push(collectResult);
            resultPromise = collectResult.promise;
        }

        if (opts.collectBody) {
            resultPromise
                .then(() => {
                    const body = this._body.toString();
                    this.emit("body", body);
                    if (typeof opts.collectBody === "function") {
                        opts.collectBody(body);
                    }
                });
        }

        return StreamUtil.pipelineAsync(...streams)
            .then(() => resultPromise);
    }
}
