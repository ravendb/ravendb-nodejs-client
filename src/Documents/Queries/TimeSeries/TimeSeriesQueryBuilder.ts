import { ITimeSeriesQueryBuilder } from "./ITimeSeriesQueryBuilder";
import { TimeSeriesQueryResult } from "./TimeSeriesQueryResult";

export class TimeSeriesQueryBuilder implements ITimeSeriesQueryBuilder {
    private _query: string;

    raw<T extends TimeSeriesQueryResult>(queryText: string): T {
        this._query = queryText;
        return null;
    }

    public get queryText() {
        return this._query;
    }
}
