export interface CollectionStatistics {
    countOfDocuments: number;
    countOfConflicts: number;
    collections: { [collection: string]: number };
}
