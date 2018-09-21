export interface StreamQueryStatistics {
    indexName: string;
    stale: boolean;
    indexTimestamp: Date;
    totalResults: number;
    resultEtag: number;
}
