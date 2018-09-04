import * as changeCase from "change-case";
import { throwError } from "../Exceptions";

export class ObjectUtil {

    // WARNING: some methods are assigned below dynamically

    public static clone(o) {
        return JSON.parse(JSON.stringify(o));
    }

    public static transformObjectKeys(
        transformName: CasingConvention, obj: object, opts?: ObjectChangeCaseOptions): object {
        const transform = ObjectUtil[transformName + "Keys"];
        if (!transform) {
            throwError("MappingError", `Could not find key case transform: ${transformName}`);
        }

        return transform(obj, opts);
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

const TRANSFORMATION_NAMES: CasingConvention[] = [
    "upper",
    "upperCase",
    "ucFirst",
    "upperCaseFirst",
    "lcFirst",
    "lowerCaseFirst",
    "lower",
    "lowerCase",
    "sentence",
    "sentenceCase",
    "title",
    "titleCase",
    "camel",
    "camelCase",
    "pascal",
    "pascalCase",
    "snake",
    "snakeCase",
    "param",
    "paramCase",
    "dot",
    "dotCase",
    "path",
    "pathCase",
    "constant",
    "constantCase",
    "swap",
    "swapCase"
];

export interface ObjectChangeCaseOptions {
    recursive?: boolean;
    arrayRecursive?: boolean;
    ignoreKeys?: Array<string | RegExp>;
    ignorePaths?: Array<string | RegExp>;
}

const DEFAULT_CHANGE_CASE_OPTIONS = {
    recursive: false,
    arrayRecursive: false,
    throwOnDuplicate: false,
    locale: null,
    ignoreKeys: [],
    ignorePaths: []
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

function computeNewValue(value, f, options, forceRecurse, stack) {
    const valueIsArray = isArray(value);
    if (valueIsArray && options.arrayRecursive) {
        const result = transformArray(value, f, options, stack);
        return result;
    } else if (isObject(value) && !valueIsArray && (options.recursive || forceRecurse)) {
        return transformObjectKeys(value, f, options, stack);
    } else {
        return value;
    }
}

function transformArray(array, f, options, stack) {
    options = setDefaults(options, module.exports.options);
    if (!isArray(array)) {
        throw new Error("transformArray expects an array");
    }
    const result = [];
    stack = [...stack, "[]"];

    for (const value of array) {
        const newValue = computeNewValue(value, f, options, true, stack);
        result.push(newValue);
    }
    stack.pop();
    return result;
}

function makeKeyPath(keyStack) {
    return keyStack.join(".");
}

// function shouldIgnoreChildNodes(currentPath, opts) {
//     // do not ignore current key, only ones under it
//     return currentPath
//         && opts.ignoreChildNodes.some(x => currentPath.indexOf(x) === 0)
// }

function shouldTransformKey(currentKey, currentPath, opts) {
    const currentPathPlusKey = currentPath ? currentPath + "." + currentKey : currentKey;
    const ignoreKey = opts.ignoreKeys.length 
        && opts.ignoreKeys.some(x => x["test"] ? x.test(currentKey) : x === currentKey);
    if (ignoreKey) {
        return false;
    }

    const ignorePath = opts.ignorePaths.length
        && opts.ignorePaths.some(x => x["test"] ? x.test(currentPathPlusKey) : x === currentPathPlusKey);
    return !ignorePath;
}

function transformObjectKeys(object, f, options, stack) {
    options = setDefaults(options, DEFAULT_CHANGE_CASE_OPTIONS);
    const result = {};
    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            const value = object[key];
            let newKey = key;
            const currentPath = makeKeyPath(stack);
            if (shouldTransformKey(key, currentPath, options)) {
                newKey = f(key, options.locale);
            }

            if (result.hasOwnProperty(newKey) && options.throwOnDuplicate) {
                throw new Error("duplicated key " + newKey);
            }

            stack = [...stack, newKey];
            result[newKey] = computeNewValue(value, f, options, false, stack);
            stack.pop();
        }
    }
    return result;
}

function makeObjectTransformation(f) {
    return function (object, options) {
        if (!object || !object.hasOwnProperty) {
            return object;
        }
        return transformObjectKeys(object, f, options, []);
    };
}

function makeArrayTransformation(f) {
    return function (array, options) {
        return transformArray(array, f, options, []);
    };
}

// creates functions that accept any kind of data structure
function makeArbitraryDataTransformation(f) {
    return function (data, options) {
        if (isArray(data)) {
            return transformArray(data, f, options, []);
        } else if (isObject(data)) {
            return transformObjectKeys(data, f, options, []);
        } else {
            return data;
        }
    };
}

function exportTransformation(name) {
    const f = changeCase[name];
    ObjectUtil[name + "Keys"] = makeObjectTransformation(f);
    ObjectUtil[name + "Array"] = makeArrayTransformation(f);
    ObjectUtil["to" + changeCase.ucFirst(name)] = makeArbitraryDataTransformation(f);
}

// reexport all functions exported by `changeCase`
for (const i in changeCase) {
    if (changeCase.hasOwnProperty(i)) {
        ObjectUtil[i] = changeCase[i];
    }
}

for (const t of TRANSFORMATION_NAMES) {
    exportTransformation(t);
}