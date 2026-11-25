import { Transform, TransformCallback } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { getError } from "../../../Exceptions/index.js";

const RESULTS_ARRAY_DEPTH = 2;

/**
 * Emits each object of the top level `Results` array in a `{"Results":[{...},{...}]}` response as a parsed value.
 * Splits on bracket depth instead of using a JSON parser, because /streams/timeseries writes a comma after every
 * entry, including the last one.
 */
export class ResultsArrayItemsStream extends Transform {
    private readonly _decoder = new StringDecoder("utf8");
    private _depth = 0;
    private _inString = false;
    private _escaped = false;
    private _item = "";

    public constructor() {
        super({ readableObjectMode: true });
    }

    public _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        try {
            this._scan(this._decoder.write(chunk));
            callback();
        } catch (err) {
            callback(err);
        }
    }

    public _flush(callback: TransformCallback): void {
        try {
            this._scan(this._decoder.end());
            callback(this._depth === 0 ? null : getError("InvalidOperationException", "Unexpected end of the time series stream."));
        } catch (err) {
            callback(err);
        }
    }

    private _scan(text: string): void {
        let itemStart = this._depth > RESULTS_ARRAY_DEPTH ? 0 : -1;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (this._inString) {
                if (this._escaped) {
                    this._escaped = false;
                } else if (char === "\\") {
                    this._escaped = true;
                } else if (char === "\"") {
                    this._inString = false;
                }
                continue;
            }

            if (char === "\"") {
                this._inString = true;
            } else if (char === "{" || char === "[") {
                this._depth++;
                if (this._depth === RESULTS_ARRAY_DEPTH + 1) {
                    itemStart = i;
                }
            } else if (char === "}" || char === "]") {
                this._depth--;
                if (this._depth === RESULTS_ARRAY_DEPTH && itemStart !== -1) {
                    this.push(JSON.parse(this._item + text.slice(itemStart, i + 1)));
                    this._item = "";
                    itemStart = -1;
                }
            }
        }

        if (itemStart !== -1) {
            this._item += text.slice(itemStart);
        }
    }
}
