import * as changeCase from "change-case";
import { TypeUtil } from "./TypeUtil";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";
import { CONSTANTS } from "../Constants";
import { MetadataObject } from "../Documents/Session/MetadataObject";
import { CompareExchangeResultItem } from "../Documents/Operations/CompareExchange/CompareExchangeValueResultParser";
import { ServerResponse } from "../Types";
import { TimeSeriesRangeResult } from "../Documents/Operations/TimeSeries/TimeSeriesRangeResult";
import { TimeSeriesEntry } from "../Documents/Session/TimeSeries/TimeSeriesEntry";
import { CounterDetail } from "../Documents/Operations/Counters/CounterDetail";
import { AttachmentDetails } from "../Documents/Attachments";

function iden(x, locale) {
    return x;
}

export class ObjectUtil {

    // WARNING: some methods are assigned below dynamically

    /**
     * @deprecated Use deepJsonClone or deepLiteralClone for better performance
     * @param o Object to clone
     */
    public static clone(o) {
        return JSON.parse(JSON.stringify(o));
    }

    public static deepJsonClone(o) {
        return JSON.parse(JSON.stringify(o));
    }

    public static deepLiteralClone(item) {
        if (!item) {
            return item;
        }

        let result;

        if (Array.isArray(item)) {
            result = [];
            for (let index = 0; index < item.length; index++) {
                result[index] = ObjectUtil.deepLiteralClone(item[index]);
            }
        } else if (TypeUtil.isObject(item)) {
            result = {};
            // tslint:disable-next-line:forin
            for (const prop in item) {
                result[prop] = ObjectUtil.deepLiteralClone(item[prop]);
            }
        } else {
            result = item;
        }

        return result;
    }

    public static mapToLiteral<TValue>(input: Map<string, TValue>): { [key: string]: TValue };
    public static mapToLiteral<TValue, TResult>(
        input: Map<string, TValue>,
        valueTransformFunc: (value: string, key: TValue) => TResult): { [key: string]: TResult };
    public static mapToLiteral<TValue, TResult>(
        input: Map<string, TValue>,
        valueTransformFunc?: (value: string, key: TValue) => TResult)
        : { [key: string]: TResult } {
        return Array.from(input.entries())
            .reduce((obj, [key, value]) => (
                Object.assign(obj, {
                    [key]: valueTransformFunc
                        ? valueTransformFunc(key, value)
                        : value
                })
            ), {});
    }

    public static transformObjectKeys(
        obj: object, opts?: ObjectChangeCaseOptions): object {
        const options: any = setDefaults(opts, DEFAULT_CHANGE_CASE_OPTIONS);
        return transformObjectKeys(obj, options, []);
    }

    public static transformDocumentKeys(obj: any, conventions: DocumentConventions) {
        if (!obj) {
            return obj;
        }
        const metadata = obj[CONSTANTS.Documents.Metadata.KEY];
        const hasMetadata = CONSTANTS.Documents.Metadata.KEY in obj;
        const transformedMetadata = hasMetadata ? ObjectUtil.transformMetadataKeys(metadata, conventions) : null;

        if (!conventions.entityFieldNameConvention) {
            // fast path - no need to transform entity - transform metadata only
            if (hasMetadata) {
                return {
                    ...obj,
                    [CONSTANTS.Documents.Metadata.KEY]: transformedMetadata
                };
            } else {
                return obj;
            }
        }

        const transformed = ObjectUtil.transformObjectKeys(obj, {
            defaultTransform: conventions.entityFieldNameConvention
        });

        if (hasMetadata) {
            transformed[CONSTANTS.Documents.Metadata.KEY] = transformedMetadata;
        }

        return transformed;
    }

    public static transformMetadataKeys(metadata: MetadataObject, conventions: DocumentConventions) {
        if (!metadata) {
            return metadata;
        }

        let result: MetadataObject = {};

        const userMetadataFieldsToTransform: any = {};
        const needsCaseTransformation = !!conventions.entityFieldNameConvention;

        for (const [key, value] of Object.entries(metadata)) {
            if (key === CONSTANTS.Documents.Metadata.ATTACHMENTS) {
                result[CONSTANTS.Documents.Metadata.ATTACHMENTS] = value ? value.map(x => ObjectUtil.mapAttachmentDetailsToLocalObject(x)) : null
            } else if (key[0] === "@" || key === "Raven-Node-Type") {
                result[key] = value;
            } else {
                if (needsCaseTransformation) {
                    userMetadataFieldsToTransform[key] = value;
                } else {
                    result[key] = value;
                }
            }
        }

        if (Object.keys(userMetadataFieldsToTransform)) {
            const transformedUserFields = ObjectUtil.transformObjectKeys(userMetadataFieldsToTransform, {
                defaultTransform: conventions.entityFieldNameConvention
            });

            result = Object.assign(result, transformedUserFields);
        }

        return result;
    }

    public static mapAttachmentDetailsToLocalObject(json: any): AttachmentDetails {
        return {
            changeVector: json.ChangeVector,
            contentType: json.ContentType,
            documentId: json.DocumentId,
            hash: json.Hash,
            name: json.Name,
            size: json.Size
        };
    }

    //TODO: use ServerCasing<CompareExchangeResultItem> instead of any, after upgrading to TS 4.2
    public static mapCompareExchangeToLocalObject(json: Record<string, any>) {
        if (!json) {
            return undefined;
        }

        const result: Record<string, CompareExchangeResultItem> = {};

        for (const [key, value] of Object.entries(json)) {
            result[key] = {
                index: value.Index,
                key: value.Key,
                value: {
                    object: value.Value?.Object
                }
            }
        }

        return result;
    }

    //TODO: use ServerCasing<ServerResponse<TimeSeriesRangeResult> instead of any, after upgrading to TS 4.2
    public static mapTimeSeriesIncludesToLocalObject(json: Record<string, Record<string, any[]>>) {
        if (!json) {
            return undefined;
        }

        const result: Record<string, Record<string, ServerResponse<TimeSeriesRangeResult>[]>> = {};

        for (const [docId, perDocumentTimeSeries] of Object.entries(json)) {
            const perDocumentResult: Record<string, ServerResponse<TimeSeriesRangeResult>[]> = {};

            for (const [tsName, tsData] of Object.entries(perDocumentTimeSeries)) {
                perDocumentResult[tsName] = tsData.map(ts => {
                    return {
                        from: ts.From,
                        to: ts.To,
                        includes: ts.Includes,
                        totalResults: ts.TotalResults,
                        entries: ts.Entries.map(entry => ({
                            timestamp: entry.Timestamp,
                            isRollup: entry.IsRollup,
                            tag: entry.Tag,
                            values: entry.Values,
                        } as ServerResponse<TimeSeriesEntry>))
                    };
                })
            }

            result[docId] = perDocumentResult;
        }

        return result;
    }

    public static mapCounterIncludesToLocalObject(json: Record<string, any[]>) {
        const result: Record<string, CounterDetail[]> = json ? {} : undefined;

        if (json) {
            for (const [key, value] of Object.entries(json)) {
                result[key] = value.map(c => {
                    return c ? {
                        changeVector: c.ChangeVector,
                        counterName: c.CounterName,
                        counterValues: c.CounterValues,
                        documentId: c.DocumentId,
                        etag: c.Etag,
                        totalValue: c.TotalValue
                    } : null;
                });
            }
        }

        return result;
    }

}

/* 
    This code is a modified version of https://github.com/claudetech/js-change-object-case
*/

export type CasingConvention =
    "upper" |
    "upperCase" |
    "ucFirst" |
    "upperCaseFirst" |
    "lcFirst" |
    "lowerCaseFirst" |
    "lower" |
    "lowerCase" |
    "sentence" |
    "sentenceCase" |
    "title" |
    "titleCase" |
    "camel" |
    "camelCase" |
    "pascal" |
    "pascalCase" |
    "snake" |
    "snakeCase" |
    "param" |
    "paramCase" |
    "dot" |
    "dotCase" |
    "path" |
    "pathCase" |
    "constant" |
    "constantCase" |
    "swap" |
    "swapCase";

export interface ObjectChangeCaseOptionsBase {
    recursive?: boolean;
    arrayRecursive?: boolean;
    ignoreKeys?: (string | RegExp)[];
    ignorePaths?: (string | RegExp)[];
    paths?: { transform: CasingConvention, path?: RegExp }[];
}

export interface ObjectChangeCaseOptions extends ObjectChangeCaseOptionsBase {
    defaultTransform: CasingConvention;
}

interface InternalObjectChangeCaseOptions extends ObjectChangeCaseOptions {
    throwOnDuplicate: boolean;
    locale: string;
}

const DEFAULT_CHANGE_CASE_OPTIONS = {
    recursive: true,
    arrayRecursive: true,
    throwOnDuplicate: false,
    locale: null,
    ignoreKeys: [],
    ignorePaths: [],
};

function setDefaults(object, defaults) {
    object = object || {};
    for (const i in defaults) {
        // eslint-disable-next-line no-prototype-builtins
        if (defaults.hasOwnProperty(i) && typeof object[i] === "undefined") {
            object[i] = defaults[i];
        }
    }
    return object;
}

function isObject(value) {
    if (!value) {
        return false;
    }
    return typeof value === "object" || typeof value === "function";
}

function isArray(value) {
    return (Array.isArray && Array.isArray(value)) ||
        Object.prototype.toString.call(value) === "[object Array]";
}

function computeNewValue(value, options, forceRecurse, stack) {
    const valueIsArray = isArray(value);
    if (valueIsArray && options.arrayRecursive) {
        return transformArray(value, options, stack);
    } else if (isObject(value) && !valueIsArray && (options.recursive || forceRecurse)) {
        return transformObjectKeys(value, options, stack);
    } else {
        return value;
    }
}

function transformArray(array, options: ObjectChangeCaseOptions, stack) {
    if (!isArray(array)) {
        throw new Error("transformArray expects an array");
    }
    const result = [];
    stack = [...stack, "[]"];

    for (const value of array) {
        const newValue = computeNewValue(value, options, true, stack);
        result.push(newValue);
    }
    stack.pop();
    return result;
}

function makeKeyPath(keyStack) {
    return keyStack.join(".");
}

function shouldTransformKey(currentKey, currentPath, opts) {
    const currentPathPlusKey = currentPath ? currentPath + "." + currentKey : currentKey;
    for (const x of opts.ignoreKeys) {
        if ("test" in x ? x.test(currentKey) : x === currentKey) {
            return false;
        }
    }

    for (const x of opts.ignorePaths) {
        if ("test" in x ? x.test(currentPathPlusKey) : x === currentPathPlusKey) {
            return false;
        }
    }

    return true;
}

function getTransformFunc(key, currentPath, opts: InternalObjectChangeCaseOptions) {
    if (opts.paths) {
        for (const p of opts.paths) {
            if (!p.path) {
                return changeCase[p.transform];
            } else if (p.path.test(currentPath)) {
                return p.transform ? changeCase[p.transform] : iden;
            }
        }
    }

    if (!opts.defaultTransform) {
        return iden;
    }

    return changeCase[opts.defaultTransform];
}

function transformObjectKeys(object, options: InternalObjectChangeCaseOptions, stack) {
    if (!object) {
        return object;
    }

    const result = {};
    for (const key in object) {
        // eslint-disable-next-line no-prototype-builtins
        if (object.hasOwnProperty(key)) {
            const value = object[key];
            let newKey = key;
            const currentPath = makeKeyPath(stack);
            if (shouldTransformKey(key, currentPath, options)) {
                const f = getTransformFunc(key, currentPath, options);
                newKey = f(key, options.locale);
            }

            // eslint-disable-next-line no-prototype-builtins
            if (result.hasOwnProperty(newKey) && options.throwOnDuplicate) {
                throw new Error("duplicated key " + newKey);
            }

            stack = [...stack, newKey];
            result[newKey] = computeNewValue(value, options, false, stack);
            stack.pop();
        }
    }
    return result;
}

// reexport all functions exported by `changeCase`
for (const i in changeCase) {
    // eslint-disable-next-line no-prototype-builtins
    if (changeCase.hasOwnProperty(i)) {
        ObjectUtil[i] = changeCase[i];
    }
}
