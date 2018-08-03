import * as stream from "readable-stream";
import * as ObjectUtil from "../../../Utility/ObjectUtil";
import { DocumentsResult } from "../../../Documents/Commands/GetDocumentsCommand";

export interface CollectResultStreamOptions<TResult> {
    reduceResults: (result: TResult, next: any) => TResult;
    initResult: TResult;
}

export class CollectResultStream<T> extends stream.Writable {

    private _result: T; // DocumentsResult = { results: [], includes: {} };
    private _reduceResults: (result: T, next: any) => T;

    private _resultPromise = new Promise((resolve, reject) => {
        this._resolver = { resolve, reject };
    });

    private _resolver: { resolve: Function, reject: Function };

    get promise(): Promise<T> {
        return this._resultPromise as Promise<T>;
    }

    constructor(opts: CollectResultStreamOptions<T>) {
        super({ objectMode: true });

        super.once("finish", () => {
            this._resolver.resolve(this._result);
        });

        const lastResult = (_: T, chunk: T) => chunk;
        this._reduceResults = opts.reduceResults || lastResult;
        this._result = opts.initResult || null;
    }

    public static collectArray<TItem>(handleEmitPath?: boolean): CollectResultStreamOptions<TItem[]> {
        return {
            initResult: [] as TItem[],
            reduceResults: (result: TItem[], n: TItem) => 
                [ ...result, handleEmitPath ? (n as any).value : n ]
        };
    }

    public _write(chunk, enc, callback) {
        this._result = this._reduceResults(this._result, chunk);
        callback();
    }
}