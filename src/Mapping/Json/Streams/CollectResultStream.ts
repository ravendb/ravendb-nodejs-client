import * as stream from "readable-stream";

export interface CollectResultStreamOptions<TResult> {
    reduceResults: (
        result: TResult,
        next: object, 
        index?: number) => TResult;
    initResult?: TResult;
}

export function lastValue(_: object, chunk: object) { 
    return chunk["value"]; 
}

export function lastChunk(_: object, chunk: object) { 
    return chunk; 
}

export class CollectResultStream<TResult = object> extends stream.Writable {

    private _resultIndex = 0;
    private _result: TResult; 
    private _reduceResults: (
        result: TResult, 
        next: object, 
        index?: number) => TResult;

    private _resultPromise = new Promise((resolve, reject) => {
        this._resolver = { resolve, reject };
    });

    private _resolver: { resolve: Function, reject: Function };

    get promise(): Promise<TResult> {
        return this._resultPromise as Promise<TResult>;
    }

    constructor(opts: CollectResultStreamOptions<TResult>) {
        super({ objectMode: true });

        super.once("finish", () => {
            this._resolver.resolve(this._result);
        });

        this._reduceResults = opts.reduceResults;
        this._result = opts.initResult || null;
    }

    public static collectArray<TItem>(handleEmitPath?: boolean): CollectResultStreamOptions<TItem[]> {
        return {
            initResult: [] as TItem[],
            reduceResults: (result: TItem[], n: object) => 
                [ ...result, handleEmitPath ? (n as any).value : n ]
        };
    }

    // tslint:disable-next-line:function-name
    public _write(chunk, enc, callback) {
        this._result = this._reduceResults(this._result, chunk, this._resultIndex);
        this._resultIndex++;
        callback();
    }
}
