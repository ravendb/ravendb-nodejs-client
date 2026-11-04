import { IndexState, IndexPriority, IndexLockMode, IndexType, SearchEngineType } from "./Enums.js";
import { IndexRunningStatus } from "./IndexingStatus.js";
import { IndexSourceType } from "./IndexSourceType.js";
import { ArchivedDataProcessingBehavior } from "../DataArchival/ArchivedDataProcessingBehavior.js";

export interface IndexStats {
    name: string;
    mapAttempts: number;
    mapSuccesses: number;
    mapErrors: number;
    mapReferenceAttempts: number;
    mapReferenceSuccesses: number;
    mapReferenceErrors: number;
    reduceAttempts: number;
    reduceSuccesses: number;
    reduceErrors: number;
    reduceOutputCollection: string;
    reduceOutputReferencePattern: string;
    patternReferencesCollectionName: string;
    mappedPerSecondRate: number;
    reducedPerSecondRate: number;
    maxNumberOfOutputsPerDocument: number;
    collections: Map<string, CollectionStats>;
    lastQueryingTime: Date;
    state: IndexState;
    priority: IndexPriority;
    createdTimestamp: Date;
    lastIndexingTime: Date;
    stale: boolean;
    lockMode: IndexLockMode;
    type: IndexType;
    searchEngineType: SearchEngineType;
    archivedDataProcessingBehavior: ArchivedDataProcessingBehavior;
    status: IndexRunningStatus;
    entriesCount: number;
    errorsCount: number;
    sourceType: IndexSourceType;
    isTestIndex: boolean;
}

export class CollectionStats {
    public lastProcessedDocumentEtag: number;
    public lastProcessedTombstoneEtag: number;
    public documentLag: number;
    public tombstoneLag: number;
    public lastProcessedTimeSeriesDeletedRangeEtag: number;

    public constructor() {
        this.documentLag = -1;
        this.tombstoneLag = -1;
    }
}
