import { AbstractTimeSeriesRange } from "./AbstractTimeSeriesRange";
import { TimeValue } from "../../../Primitives/TimeValue";
import { TimeSeriesRangeType } from "./TimeSeriesRangeType";

export interface TimeSeriesTimeRange extends AbstractTimeSeriesRange {
    time: TimeValue;
    type: TimeSeriesRangeType;
}