import { pascalCaseReplacer } from "./Replacers.js";
import { camelCaseReviver } from "./Revivers.js";

export type ReviverFunction = (key: string, value: any) => any;
export type ReplacerFunction = (key: string, value: any) => any;

export class JsonSerializer {

    private readonly _reviver?: ReviverFunction;
    private readonly _replacer?: ReplacerFunction;

    constructor(reviver: ReviverFunction, replacer: ReplacerFunction) {
        this._reviver = reviver;
        this._replacer = replacer;
    }

    public deserialize<TResult = object>(jsonString: string) {
        return JSON.parse(jsonString, this._reviver) as TResult;
    }

    public serialize(obj: object): string {
        return JSON.stringify(obj, this._replacer);
    }

    /**
     * Serializer which doesn't touch casing - just using build-in JS functions like
     * stringify and parse.
     */
    public static getDefault(): JsonSerializer {
        return new JsonSerializer(undefined, undefined);
    }

    /**
     * Serialization changes from camelCasing to PascalCasing
     * Deserialization changes from PascalCasing to camelCasing
     */
    public static getDefaultForCommandPayload(): JsonSerializer {
        return new JsonSerializer(camelCaseReviver, pascalCaseReplacer);
    }

    public static toPlainObject<T>(obj: T): T {
        if (obj === undefined) {
            return undefined as T;
        }
        
        return JSON.parse(JSON.stringify(obj));
    }
}