import { AbstractTimeSeriesRange } from "./AbstractTimeSeriesRange";

export interface TimeSeriesRange extends AbstractTimeSeriesRange {
    from: Date;
    to: Date;
}