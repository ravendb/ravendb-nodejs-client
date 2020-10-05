import { TimeSeriesItemDetail } from "./TimeSeriesItemDetail";

export interface TimeSeriesStatistics {
    documentId: string;
    timeSeries: TimeSeriesItemDetail[];
}