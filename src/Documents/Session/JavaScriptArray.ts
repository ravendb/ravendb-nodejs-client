
export class JavaScriptArray<U> {
    private _suffix: number;
    private _argCounter: number = 0;

    private readonly _pathToArray: string;

    private _scriptLines: string[] = [];
    private _parameters = {};

    constructor(suffix: number, pathToArray: string) {
        this._suffix = suffix;
        this._pathToArray = pathToArray;
    }

    public push(...u: U[]): this {
        if (!u || u.length === 0) {
            return;
        }

        const args = u.map(value => {
            const argumentName = this._getNextArgumentName();
            this._parameters[argumentName] = value;
            return "args." + argumentName;
        }).join(",");

        this._scriptLines.push("this." + this._pathToArray + ".push(" + args + ");");
        return this;
    }

    public removeAt(index: number): this {
        const argumentName = this._getNextArgumentName();

        this._scriptLines.push("this." + this._pathToArray + ".splice(args." + argumentName + ", 1);");
        this._parameters[argumentName] = index;
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
}
