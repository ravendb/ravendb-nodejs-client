export interface IndexPerformanceStats {
    name: string;
    performance: IndexingPerformanceStats[];
}

export interface IndexingPerformanceBasicStats {
    inputCount: number;
    failedCount: number;
    outputCount: number;
    successCount: number;
    started: Date;
    durationInMs: number;
    allocatedManagedBytes: number;
    allocatedUnmanagedBytes: number;
    documentsSize: number;
    tombstoneDeleteSuccesses: number;
}

export interface IndexingPerformanceStats extends IndexingPerformanceBasicStats {
    id: number;
    completed: Date;
    details: IndexingPerformanceOperation;
}

export interface IndexingPerformanceOperation {
    name: string;
    durationInMs: number;
    reduceDetails: ReduceRunDetails;
    mapDetails: MapRunDetails;
    cleanupDetails: CleanupRunDetails;
    luceneMergeDetails: LuceneMergeDetails;
    commitDetails: StorageCommitDetails;
    operations: IndexingPerformanceOperation[];
    referenceDetails: ReferenceRunDetails;
}

export interface ReduceRunDetails {
    processPrivateMemory: number;
    processWorkingSet: number;
    currentlyAllocated: number;
    reduceAttempts: number;
    reduceSuccesses: number;
    reduceErrors: number;
    treesReduceDetails: TreesReduceDetails;
}

export interface TreesReduceDetails {
    numberOfModifiedLeafs: number;
    numberOfModifiedBranches: number;
    numberOfCompressedLeafs: number;
}

export interface MapRunDetails {
    batchCompleteReason: string;
    processPrivateMemory: number;
    processWorkingSet: number;
    currentlyAllocated: number;
    allocationBudget: number;
}

export interface ReferenceRunDetails {
    referenceAttempts: number;
    referenceSuccesses: number;
    referenceErrors: number;
    processPrivateMemory: number;
    processWorkingSet: number;
    currentlyAllocated: number;
    allocationBudget: number;
    batchCompleteReason: string;
}

export interface CleanupRunDetails {
    deleteSuccesses: number;
    batchCompleteReason: string;
}

export interface LuceneMergeDetails {
    totalMergesCount: number;
    executedMergesCount: number;
    mergedFilesCount: number;
    mergedDocumentsCount: number;
}

export interface StorageCommitDetails {
    numberOfModifiedPages: number;
    numberOf4KbsWrittenToDisk: number;
}
