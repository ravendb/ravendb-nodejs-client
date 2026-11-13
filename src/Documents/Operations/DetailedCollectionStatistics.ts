import { CollectionDetails } from "./CollectionDetails.js";

export interface DetailedCollectionStatistics {
    countOfDocuments: number;
    countOfConflicts: number;
    countOfRevisionDocuments: number;
    countOfTombstones: number;
    countOfTimeSeriesDeletedRanges: number;
    countOfDocumentsConflicts: number;
    countOfAttachments: number;
    countOfCounterEntries: number;
    countOfTimeSeriesSegments: number;
    collections: Record<string, CollectionDetails>;
}
