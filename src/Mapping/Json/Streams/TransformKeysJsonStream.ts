
import * as stream from "readable-stream";
import * as FilterBase from "stream-json/filters/FilterBase";
import { ObjectUtil, CasingConvention } from "../../../Utility/ObjectUtil";

export interface TransformJsonKeysRule {
    test?: (key: string, stack: Array<string | null | number>) => boolean;
    transform: CasingConvention;
}

export interface TransformJsonKeysStreamOptions {
    rules?: TransformJsonKeysRule[];
}

export class TransformKeysJsonStream extends FilterBase {

    private _rules: TransformJsonKeysRule[];

    constructor(opts: TransformJsonKeysStreamOptions) {
        super();
        opts = opts || {};
        this._rules = opts.rules || [];
        this._rules.reverse();
    }

    private _transformKey(key) {
        let len = this._rules.length;
        while (len--) {
            const rule = this._rules[len];
            if (!rule.test || rule.test(key, this._stack)) {
                const transform = ObjectUtil[rule.transform];
                return transform ? transform(key) : key; 
            }
        }

        return key;
    }

    private _checkChunk(chunk) {
        switch (chunk.name) {
            case "keyValue":
                this.push({ name: "keyValue", value: this._transformKey(chunk.value) });
                break;
            default:
                this.push(chunk);
        }

        return false;
    }
}
