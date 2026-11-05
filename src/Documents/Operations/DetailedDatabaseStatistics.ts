import { DatabaseStatistics } from "./DatabaseStatistics.js";

export interface DetailedDatabaseStatistics extends DatabaseStatistics {
    countOfIdentities: number;
    countOfCompareExchange: number;
    countOfCompareExchangeTombstones: number;
    countOfTimeSeriesDeletedRanges: number;
    countOfRemoteAttachments: number;
}
