import { Transform } from "node:stream";
import {
    ObjectUtil,
    ObjectChangeCaseOptions
} from "../../../Utility/ObjectUtil.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";

export interface ObjectKeyCaseTransformStreamOptions
    extends ObjectChangeCaseOptions {
}

const DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS = {
    arrayRecursive: true,
    recursive: true
};


export class ObjectKeyCaseTransformStream extends Transform {

    constructor(private _opts: ObjectKeyCaseTransformStreamOptions) {
        super({ objectMode: true });

        this._opts = Object.assign({}, DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS, this._opts);
    }

    public _transform(chunk: any, enc: string, callback) {
        callback(null, ObjectKeyCaseTransformStream.transformKeys(chunk, this._opts));
    }

    public static transformKeys(entry: any, transformOpts: ObjectKeyCaseTransformStreamOptions) {
        if (TypeUtil.isPrimitive(entry) || TypeUtil.isNullOrUndefined(entry)) {
            return entry;
        }

        const opts = Object.assign({}, DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS, transformOpts);
        opts.ignorePaths = [...new Set(opts.ignorePaths || [])];

        return ObjectUtil.transformObjectKeys(entry, opts);
    }
}
