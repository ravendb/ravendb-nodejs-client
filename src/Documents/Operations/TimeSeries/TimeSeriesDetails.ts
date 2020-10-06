import { TimeSeriesRangeResult } from "./TimeSeriesRangeResult";

export class TimeSeriesDetails {
    public id: string;
    public values: Map<string, TimeSeriesRangeResult[]>; //TODO: map or record?
}