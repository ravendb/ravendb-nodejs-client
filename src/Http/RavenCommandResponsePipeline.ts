import { EventEmitter } from "events";
import { parser } from "stream-json";
import { 
    ObjectKeyCaseTransformStreamOptions, 
    ObjectKeyCaseTransformStream } from "../Mapping/Json/Streams/ObjectKeyCaseTransformStream";
import {
    ObjectKeyCaseTransformProfile,
    getObjectKeyCaseTransformProfile } from "../Mapping/Json/Conventions";
import { ObjectUtil, CasingConvention } from "../Utility/ObjectUtil";
import * as through2 from "through2";
import * as StreamUtil from "../Utility/StreamUtil";
import * as stream from "readable-stream";
import { 
    CollectResultStream, 
    CollectResultStreamOptions, 
    lastValue, lastChunk } from "../Mapping/Json/Streams/CollectResultStream";
import { throwError } from "../Exceptions";
import * as StringBuilder from "string-builder";

export interface RavenCommandResponsePipelineOptions<TResult> {
    collectBody?: boolean | ((body: string) => void);
    jsonAsync?: {
        filters: any[]
    };
    jsonSync?: boolean;
    streamKeyCaseTransform?: ObjectKeyCaseTransformStreamOptions;
    collectResult: CollectResultStreamOptions<TResult>;
    transform?: stream.Stream;
} 

export class RavenCommandResponsePipeline<TStreamResult> extends EventEmitter {

    private _opts: RavenCommandResponsePipelineOptions<TStreamResult>;
    private _body: StringBuilder = new StringBuilder();

    private constructor() {
        super();
        this._opts = {} as RavenCommandResponsePipelineOptions<TStreamResult>;
    }

    public static create<TResult>(): RavenCommandResponsePipeline<TResult> {
        return new RavenCommandResponsePipeline();
    }

    public parseJsonAsync(filters: any[]) {
        this._opts.jsonAsync = { filters };
        return this;
    }

    public parseJsonSync() {
        this._opts.jsonSync = true;
        return this;
    }

    public collectBody(callback?: (body: string) => void) {
        this._opts.collectBody = callback || true;
        return this;
    }

    public streamKeyCaseTransform(defaultTransform: CasingConvention, profile?: ObjectKeyCaseTransformProfile): this;
    public streamKeyCaseTransform(opts: ObjectKeyCaseTransformStreamOptions): this;
    public streamKeyCaseTransform(
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

    public customTransform(transform: stream.Transform) {
        this._opts.transform = transform;
        return this;
    }

    public stream(src: stream.Stream): stream.Readable {
        const streams = this._buildUp(src);
        return (stream.pipeline as any)(...streams) as stream.Readable;
    }

    private _appendBody(s): void {
        this._body.append(s);
    }

    private _buildUp(src: stream.Stream) {
        if (!src) {
            throwError("MappingError", "Body stream cannot be null.");
        }

        const opts = this._opts;
        const streams: stream.Stream[] = [ src ];
        const appendBody = (chunk) => this._appendBody(chunk);
        if (opts.collectBody) {
            streams.push(through2(function (chunk, enc, callback) {
                appendBody(chunk);
                callback(null, chunk);
            }));
        }

        if (opts.jsonAsync) {
            streams.push(parser());
            streams.push(...opts.jsonAsync.filters);
        } else if (opts.jsonSync) {
            let json = "";
            streams.push(through2.obj(
                function (chunk, enc, callback) { json += chunk.toString("utf8"); callback(); }, 
                function (callback) { 
                    let result;

                    try {
                        result = JSON.parse(json);
                    } catch (err) {
                        throwError("InvalidOperationException", `Error parsing response: '${json}'.`, err);
                    }

                    this.push(result); 
                    callback(); 
                }));
        }

        if (opts.streamKeyCaseTransform) {
            const handlePath = !!opts.jsonAsync;
            const keyCaseOpts = Object.assign({}, opts.streamKeyCaseTransform, { handlePath });
            streams.push(new ObjectKeyCaseTransformStream(keyCaseOpts));
        }

        if (opts.transform) {
            streams.push(opts.transform);
        }

        return streams;
    }

    public process(src: stream.Stream): Promise<TStreamResult> {
        const streams = this._buildUp(src);
        const opts = this._opts;
        let collectResultsOpts = opts.collectResult;
        if (!collectResultsOpts || !collectResultsOpts.reduceResults) {
            if (opts.jsonAsync) {
                collectResultsOpts = { reduceResults: lastValue as any };
            } else {
                collectResultsOpts = { reduceResults: lastChunk as any };
            }
        }

        const collectResult = new CollectResultStream(collectResultsOpts);
        streams.push(collectResult);

        const resultsPromise = collectResult.promise
            .then(result => {
                
                if (opts.collectBody) {
                    const body = this._body.toString();
                    this.emit("body", body);
                    if (typeof opts.collectBody === "function") {
                        opts.collectBody(body);
                    }
                }

                return result;
            });

        return StreamUtil.pipelineAsync(...streams).then(() => resultsPromise);
    }
}
