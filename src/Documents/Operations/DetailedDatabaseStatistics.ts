import { DatabaseStatistics } from "./DatabaseStatistics";

export interface DetailedDatabaseStatistics extends DatabaseStatistics {
    countOfIdentities: number;
    countOfCompareExchange: number;
    countOfCompareExchangeTombstones: number;
    countOfTimeSeriesDeletedRanges: number;
}
