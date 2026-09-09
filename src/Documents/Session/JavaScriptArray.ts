export type JavaScriptArrayOperation<U> =
    | { type: "push"; values: U[] }
    | { type: "removeAt"; index: number };

export class JavaScriptArray<U> {
    private readonly _suffix: number;
    private _argCounter: number = 0;

    private readonly _pathToArray: string;

    private _scriptLines: string[] = [];
    private _parameters = {};
    private readonly _operations: JavaScriptArrayOperation<U>[] = [];

    constructor(suffix: number, pathToArray: string) {
        this._suffix = suffix;
        this._pathToArray = pathToArray;
    }

    public push(...u: U[]): this {
        if (!u || u.length === 0) {
            return this;
        }

        const args = u.map(value => {
            const argumentName = this._getNextArgumentName();
            this._parameters[argumentName] = value;
            return "args." + argumentName;
        }).join(",");

        this._scriptLines.push("this." + this._pathToArray + ".push(" + args + ");");
        this._operations.push({ type: "push", values: [...u] });
        return this;
    }

    public removeAt(index: number): this {
        const argumentName = this._getNextArgumentName();

        this._scriptLines.push("this." + this._pathToArray + ".splice(args." + argumentName + ", 1);");
        this._parameters[argumentName] = index;
        this._operations.push({ type: "removeAt", index });
        return this;
    }

    private _getNextArgumentName() {
        return "val_" + this._argCounter++ + "_" + this._suffix;
    }

    get script() {
        return this._scriptLines.join("\n");
    }

    get parameters() {
        return this._parameters;
    }

    /**
     * The operations requested so far, in call order. The session uses them to emit an
     * RFC 6902 JsonPatch instead of the script when every operation has a JsonPatch equivalent.
     */
    get operations(): ReadonlyArray<JavaScriptArrayOperation<U>> {
        return this._operations;
    }
}
