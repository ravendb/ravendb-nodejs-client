
import * as stream from "readable-stream";
import * as FilterBase from "stream-json/filters/FilterBase";
import { ObjectUtil, CasingConvention } from "../../../Utility/ObjectUtil";
import { throwError } from "../../../Exceptions";

export interface TransformJsonKeysStreamOptions {
    getCurrentTransform?: (key: string, stack: Array<string | null | number>) => CasingConvention;
}

export class TransformKeysJsonStream extends FilterBase {

    private _getTransform: (key: string, stack: Array<string | null | number>) => CasingConvention;

    constructor(opts: TransformJsonKeysStreamOptions) {
        super();
        opts = opts || { getCurrentTransform: (key, stack) => null };
        if (!opts.getCurrentTransform) {
            throwError("InvalidArgumentException", "getCurrentTransform() must not be empty.");
        }

        this._getTransform = opts.getCurrentTransform;
    }

    private _transformKey(key) {
        const transformName = this._getTransform(key, this._stack);
        if (!transformName) {
            return key;
        }

        return ObjectUtil[transformName](key);
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
