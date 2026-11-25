import { QueryResult } from "../QueryResult.js";

export class Explanations {
    private _explanations: { [key: string]: string[] };

    public get explanations() {
        return this._explanations;
    }

    public set explanations(value) {
        this._explanations = value;
    }

    public getExplanations(key: string): string[] | null {
        return this._explanations && Object.hasOwn(this._explanations, key) ? this._explanations[key] : null;
    }

    public update(queryResult: QueryResult) {
        this._explanations = queryResult.explanations;
    }
}
