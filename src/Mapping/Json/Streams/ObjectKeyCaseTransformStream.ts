import * as stream from "readable-stream";
import { ObjectUtil, ObjectChangeCaseOptions, ObjectChangeCaseOptionsBase } from "../../../Utility/ObjectUtil";
import { TypeUtil } from "../../../Utility/TypeUtil";

export interface ObjectKeyCaseTransformStreamOptionsBase extends ObjectChangeCaseOptionsBase {
    extractIgnorePaths?: ((entry: object) => Array<string | RegExp>);
}
export interface ObjectKeyCaseTransformStreamOptions 
    extends ObjectChangeCaseOptions {
    handleKeyValue?: boolean;
    extractIgnorePaths?: ((entry: object) => Array<string | RegExp>);
}

const DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS = {
    arrayRecursive: true,
    recursive: true
};

export class ObjectKeyCaseTransformStream extends stream.Transform {

    private _ignorePaths: Array<string | RegExp>;
    private _getIgnorePaths: (entry: object) => Array<string | RegExp> = 
        () => this._ignorePaths

    private _handleKeyValue: boolean;

    constructor(private _opts: ObjectKeyCaseTransformStreamOptions) {
        super({ objectMode: true });

        _opts = Object.assign({}, DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS, _opts);
        ObjectKeyCaseTransformStream._validateOpts(_opts);
        
        if (typeof _opts.extractIgnorePaths === "function") {
            this._getIgnorePaths = _opts.extractIgnorePaths;
        } 

        this._handleKeyValue = _opts.handleKeyValue;
    }

    // tslint:disable-next-line:function-name
    public _transform(chunk: any, enc: string, callback) {
        let entry = this._handleKeyValue ? chunk["value"] : chunk;
        const key = chunk["key"];
        if (TypeUtil.isPrimitive(entry) || TypeUtil.isNullOrUndefined(entry)) {
            return callback(null, chunk);
        }

        const ignorePaths = this._getIgnorePaths(entry);
        const opts = Object.assign({}, this._opts);
        opts.ignorePaths = [...new Set((opts.ignorePaths || [])
            .concat(ignorePaths || []))]; 

        process.nextTick(() => {
            entry = ObjectUtil.transformObjectKeys(entry, opts);
            const data = this._handleKeyValue
                ? { key, value: entry }
                : entry;
            callback(null, data);
        });
    }

    private static _validateOpts(opts: ObjectKeyCaseTransformStreamOptions) {
        if (opts.defaultTransform && !ObjectUtil[opts.defaultTransform]) {
            throw new Error(`Unknown key casing convention: ${opts.defaultTransform}`);
        }
    }
}
