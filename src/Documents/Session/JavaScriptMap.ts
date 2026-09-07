import { EOL } from "../../Utility/OsUtil.js";

export type JavaScriptMapOperation<TKey, TValue> =
    | { type: "set"; key: TKey; value: TValue }
    | { type: "remove"; key: TKey };

export class JavaScriptMap<TKey, TValue> {
    private readonly _suffix: number;
    private _argCounter: number = 0;

    private readonly _pathToMap: string;

    private readonly _scriptLines = [];
    private readonly _parameters: Record<string, any> = {};
    private readonly _operations: JavaScriptMapOperation<TKey, TValue>[] = [];

    constructor(suffix: number, pathToMap: string) {
        this._suffix = suffix;
        this._pathToMap = pathToMap;
    }

    public set(key: TKey, value: TValue) {
        const argumentName = this._getNextArgumentName();

        this._scriptLines.push("this." + this._pathToMap + "[" + JavaScriptMap._quoteKey(key) + "] = args." + argumentName + ";");
        this._parameters[argumentName] = value;
        this._operations.push({ type: "set", key, value });

        return this;
    }

    public remove(key: TKey) {
        this._scriptLines.push("delete this." + this._pathToMap + "[" + JavaScriptMap._quoteKey(key) + "];");
        this._operations.push({ type: "remove", key });
        return this;
    }

    // Bracket notation with a JSON string literal keeps the script valid for any key
    // (whitespace, dots, quotes), same as the C# client's FormatKeyForJavaScript.
    private static _quoteKey(key: unknown): string {
        return JSON.stringify(String(key));
    }

    private _getNextArgumentName() {
        return "val_" + this._argCounter++ + "_" + this._suffix;
    }

    getScript(): string {
        return this._scriptLines.join(EOL);
    }

    get parameters() {
        return this._parameters;
    }

    /**
     * The operations requested so far, in call order. The session uses them to emit an
     * RFC 6902 JsonPatch instead of the script when every operation has a JsonPatch equivalent.
     */
    get operations(): ReadonlyArray<JavaScriptMapOperation<TKey, TValue>> {
        return this._operations;
    }
}
