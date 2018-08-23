import * as stream from "readable-stream";
import { ObjectUtil, ObjectChangeCaseOptions, CasingConvention } from '../../../Utility/ObjectUtil';
import { getError, throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";

export interface ObjectKeyCaseTransformStreamOptions extends ObjectChangeCaseOptions {
    targetKeyCaseConvention: CasingConvention;
    handlePath?: boolean;
    extractIgnorePaths?: ((entry: object) => Array<string | RegExp>);
}

const DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS = {
    arrayRecursive: true,
    recursive: true
};

export class ObjectKeyCaseTransformStream extends stream.Transform {

    private _recursive: boolean;
    private _arrayRecursive: boolean;
    private _ignoreKeys: Array<string | RegExp>;
    private _ignorePaths: Array<string | RegExp>;
    private _getIgnorePaths: (entry: object) => Array<string | RegExp> = 
        () => this._ignorePaths

    private _keyCaseTransform: CasingConvention;
    private _handlePath: boolean;

    constructor(opts: ObjectKeyCaseTransformStreamOptions) {
        super({ objectMode: true });

        opts = Object.assign({}, DEFAULT_OBJECT_KEY_CASE_TRANSFORM_OPTS, opts);
        ObjectKeyCaseTransformStream._validateOpts(opts);
        
        if (typeof opts.extractIgnorePaths === "function") {
            this._getIgnorePaths = opts.extractIgnorePaths;
        } else {
            this._ignorePaths = opts.ignorePaths || [];
        }

        this._keyCaseTransform = opts.targetKeyCaseConvention;
        this._handlePath = opts.handlePath;
        this._ignoreKeys = opts.ignoreKeys || [];
        this._recursive = opts.recursive;
        this._arrayRecursive = opts.arrayRecursive;
    }

    // tslint:disable-next-line:function-name
    public _transform(chunk: any, enc: string, callback) {
        let entry = this._handlePath 
            ? chunk.value : chunk;
        if (TypeUtil.isPrimitive(entry)) {
            return callback(null, chunk);
        }

        const entryPath = this._handlePath ? chunk.path : null;
        const ignorePaths = this._getIgnorePaths(entry);

        process.nextTick(() => {
            entry = ObjectUtil.transformObjectKeys(this._keyCaseTransform, entry, {
                recursive: this._recursive,
                arrayRecursive: this._arrayRecursive,
                ignoreKeys: this._ignoreKeys,
                ignorePaths
            });
            
            const data = this._handlePath
                ? { path: entryPath, value: entry }
                : entry;
            callback(null, data);
        });
    }

    private static _validateOpts(opts: ObjectKeyCaseTransformStreamOptions) {
        if (!opts.targetKeyCaseConvention) {
            throwError("MappingError", "Key case convention cannot be null.");
        }

        if (opts.targetKeyCaseConvention && !ObjectUtil[opts.targetKeyCaseConvention + "Keys"]) {
            throw new Error(`Unknown key casing convention: ${opts.targetKeyCaseConvention}`);
        }
    }
}
