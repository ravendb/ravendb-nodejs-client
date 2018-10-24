import { Highlightings } from "./Hightlightings";
import { QueryResult } from "../QueryResult";

export class QueryHighlightings {

    private readonly _highlightings: Highlightings[] = [];

    public add(fieldName: string): Highlightings {
        const fieldHighlightings = new Highlightings(fieldName);
        this._highlightings.push(fieldHighlightings);
        return fieldHighlightings;
    }
    public update(queryResult: QueryResult): void {
        for (const fieldHighlightings of this._highlightings) {
            fieldHighlightings.update(queryResult.highlightings);
        }
    }
}
