import { StringUtil } from "../../Utility/StringUtil.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";

interface IncludePath {
    path: string;
    addition: string;
    isPrefix: boolean;
}

const INCLUDE_PREFIX_REGEX = /(\([^)]+\))$/;
const INCLUDE_SUFFIX_REGEX = /(\[[{0}/][^\]]+\])$/;
const COLLECTION_SEPARATOR = "[].";

export class IncludesUtil {

    public static include(
        document: object, include: string, loadId: (id: string) => void): void {
        if (!include || !document) {
            return;
        }

        const { path, addition, isPrefix } = IncludesUtil._getIncludePath(include);

        for (const token of IncludesUtil._selectTokens(document, path)) {
            IncludesUtil._executeInternal(token, addition, (value, valueAddition) => {
                if (!valueAddition) {
                    loadId(value);
                } else {
                    loadId(isPrefix ? valueAddition + value : valueAddition.split("{0}").join(value));
                }
            });
        }
    }

    private static _getIncludePath(include: string): IncludePath {
        const prefixMatch = INCLUDE_PREFIX_REGEX.exec(include);
        const match = prefixMatch ?? INCLUDE_SUFFIX_REGEX.exec(include);
        if (!match) {
            return { path: include, addition: null, isPrefix: false };
        }

        const addition = match[1];
        return {
            path: include.split(addition).join(""),
            addition: addition.substring(1, addition.length - 1),
            isPrefix: !!prefixMatch
        };
    }

    private static _selectTokens(document: object, path: string): unknown[] {
        const [firstPath, ...nestedPaths] = path.split(COLLECTION_SEPARATOR);
        const result = IncludesUtil._readPath(document, firstPath);

        if (!nestedPaths.length) {
            return [result];
        }

        const nestedPath = nestedPaths.join(COLLECTION_SEPARATOR);

        if (TypeUtil.isArray(result)) {
            return result.flatMap(item =>
                TypeUtil.isObject(item) ? IncludesUtil._selectTokens(item, nestedPath) : [item]);
        }

        if (TypeUtil.isObject(result)) {
            return Object.values(result)
                .filter(value => TypeUtil.isObject(value))
                .flatMap(value => IncludesUtil._selectTokens(value, nestedPath));
        }

        return [];
    }

    private static _readPath(document: object, path: string): unknown {
        let current: unknown = document;

        for (const property of path.split(".")) {
            if (!TypeUtil.isObject(current)) {
                return null;
            }

            current = current[property];
        }

        return current;
    }

    private static _executeInternal(
        token: unknown, addition: string, loadId: (value: string, addition: string) => void): void {
        if (TypeUtil.isArray(token)) {
            for (const item of token) {
                IncludesUtil._executeInternal(item, addition, loadId);
            }
        } else if (TypeUtil.isString(token) && token) {
            loadId(token, addition);

            if (addition) {
                loadId(token, null);
            }
        } else if (Number.isInteger(token)) {
            loadId(String(token), addition);
        }
    }

    public static requiresQuotes(include: string, escapedIncludeSetter: (value: string) => void): boolean {
        for (let i = 0; i < include.length; i++) {
            const ch = include.charAt(i);
            if (!(StringUtil.isLetter(ch) || StringUtil.isDigit(ch)) && ch !== "_" && ch !== ".") {
                escapedIncludeSetter(include.replace(/'/g, String.raw`\'`));
                return true;
            }
        }

        escapedIncludeSetter(null);
        return false;
    }
}
