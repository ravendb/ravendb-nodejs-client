export interface StreamQueryStatistics {
    indexName: string;
    isStale: boolean;
    /**
     * @deprecated The server never sends this field. Use isStale instead.
     */
    stale: boolean;
    indexTimestamp: Date;
    totalResults: number;
    resultEtag: number;
}
