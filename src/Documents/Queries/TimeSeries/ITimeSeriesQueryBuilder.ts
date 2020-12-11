import { TimeSeriesQueryResult } from "./TimeSeriesQueryResult";

export interface ITimeSeriesQueryBuilder {
    raw<T extends TimeSeriesQueryResult>(queryText: string): T;
}