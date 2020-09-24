import { CollectionDetails } from "./CollectionDetails";

export interface DetailedCollectionStatistics {
    countOfDocuments: number;
    countOfConflicts: number;
    collections: Record<string, CollectionDetails>;
}
