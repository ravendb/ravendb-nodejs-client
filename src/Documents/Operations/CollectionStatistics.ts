export interface CollectionStatistics {
    countOfDocuments: number;
    countOfConflicts: number;
    countOfRevisionDocuments: number;
    countOfTombstones: number;
    countOfTimeSeriesDeletedRanges: number;
    countOfDocumentsConflicts: number;
    countOfAttachments: number;
    countOfCounterEntries: number;
    countOfTimeSeriesSegments: number;
    collections: { [collection: string]: number };
}
