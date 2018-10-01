import * as changeCase from "change-case";

function iden(x, locale) {
    return x;
}

export class ObjectUtil {

    // WARNING: some methods are assigned below dynamically

    public static clone(o) {
        return JSON.parse(JSON.stringify(o));
    }

    public static mapToLiteral<TValue, TResult>(
        input: Map<string, TValue>, valueTransformFunc: (value: string, key: TValue) => TResult) {
        return Array.from(input).reduce((obj, [key, value]) => (
            Object.assign(obj, {[key]: valueTransformFunc(key, value)})
        ), {});
    }

    public static transformObjectKeys(
        obj: object, opts?: ObjectChangeCaseOptions): object {
        const options: any = setDefaults(opts, DEFAULT_CHANGE_CASE_OPTIONS);
        return transformObjectKeys(obj, options, []);
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
    ignoreKeys?: Array<string | RegExp>;
    ignorePaths?: Array<string | RegExp>;
    paths?: Array<{ transform: CasingConvention, path?: RegExp }>;
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
        if (object.hasOwnProperty(key)) {
            const value = object[key];
            let newKey = key;
            const currentPath = makeKeyPath(stack);
            if (shouldTransformKey(key, currentPath, options)) {
                const f = getTransformFunc(key, currentPath, options);
                newKey = f(key, options.locale);
            }

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
    if (changeCase.hasOwnProperty(i)) {
        ObjectUtil[i] = changeCase[i];
    }
}
