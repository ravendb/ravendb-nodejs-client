import { AbstractTimeSeriesRange } from "./AbstractTimeSeriesRange";
import { TimeSeriesRangeType } from "./TimeSeriesRangeType";

export interface TimeSeriesCountRange extends AbstractTimeSeriesRange {
    count: number;
    type: TimeSeriesRangeType;
}