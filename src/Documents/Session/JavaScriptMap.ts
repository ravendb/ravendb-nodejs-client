import * as os from "os";

export class JavaScriptMap<TKey, TValue> {
    private readonly _suffix: number;
    private _argCounter: number = 0;

    private readonly _pathToMap: string;

    private readonly _scriptLines = [];
    private readonly _parameters = new Map<string, any>();

    constructor(suffix: number, pathToMap: string) {
        this._suffix = suffix;
        this._pathToMap = pathToMap;
    }

    public set(key: TKey, value: TValue) {
        const argumentName = this._getNextArgumentName();

        this._scriptLines.push("this." + this._pathToMap + "." + key + " = args." + argumentName + ";");
        this._parameters.set(argumentName, value);

        return this;
    }

    public remove(key: TKey) {
        this._scriptLines.push("delete this." + this._pathToMap + "." + key + ";");
        return this;
    }

    private _getNextArgumentName() {
        return "val_" + this._argCounter++ + "_" + this._suffix;
    }

    getScript(): string {
        return this._scriptLines.join(os.EOL);
    }

    get parameters() {
        return this._parameters;
    }
}