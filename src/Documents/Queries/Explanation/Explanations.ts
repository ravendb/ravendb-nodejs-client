import { QueryResult } from "../QueryResult";

export class Explanations {
    private _explanations: { [key: string]: string[] };

    public get explanations() {
        return this._explanations;
    }

    public set explanations(value) {
        this._explanations = value;
    }

    public update(queryResult: QueryResult) {
        this._explanations = queryResult.explanations;
    }
}
