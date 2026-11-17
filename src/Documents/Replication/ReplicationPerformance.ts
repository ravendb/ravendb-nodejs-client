export interface ReplicationPerformance {
    outgoing: OutgoingReplicationStats[];
    incoming: IncomingReplicationStats[];
}

export interface OutgoingReplicationStats {
    destination: string;
    performance: OutgoingReplicationPerformanceStats[];
}

export interface IncomingReplicationStats {
    source: string;
    performance: IncomingReplicationPerformanceStats[];
}

export interface ReplicationPerformanceBase {
    id: number;
    started: Date;
    durationInMs: number;
    completed: Date;
    batchSizeInBytes: number;
    details: ReplicationPerformanceOperation;
    errors: ReplicationError[];
}

export interface ReplicationPerformanceOperation {
    name: string;
    durationInMs: number;
    operations: ReplicationPerformanceOperation[];
}

export interface ReplicationError {
    error: string;
    timestamp: Date;
}

export interface IncomingReplicationPerformanceStats extends ReplicationPerformanceBase {
    receivedLastEtag: number;
    databaseChangeVector: string;
    network: IncomingReplicationNetworkStats;
}

export interface IncomingReplicationNetworkStats {
    inputCount: number;
    documentReadCount: number;
    documentReadSizeInBytes: number;
    documentTombstoneReadCount: number;
    documentTombstoneReadSizeInBytes: number;
    revisionReadCount: number;
    revisionReadSizeInBytes: number;
    revisionTombstoneReadCount: number;
    revisionTombstoneReadSizeInBytes: number;
    attachmentReadCount: number;
    attachmentReadSizeInBytes: number;
    attachmentStreamReadCount: number;
    attachmentStreamReadSizeInBytes: number;
    attachmentTombstoneReadCount: number;
    attachmentTombstoneReadSizeInBytes: number;
    counterReadCount: number;
    counterReadSizeInBytes: number;
    timeSeriesReadCount: number;
    timeSeriesReadSizeInBytes: number;
    timeSeriesDeletedRangeReadCount: number;
    timeSeriesDeletedRangeReadSizeInBytes: number;
}

export interface OutgoingReplicationPerformanceStats extends ReplicationPerformanceBase {
    sendLastEtag: number;
    lastAcceptedChangeVector: string;
    storage: OutgoingReplicationStorageStats;
    network: OutgoingReplicationNetworkStats;
}

export interface OutgoingReplicationStorageStats {
    inputCount: number;
    artificialDocumentSkipCount: number;
    systemDocumentSkipCount: number;
    changeVectorSkipCount: number;
}

export interface OutgoingReplicationNetworkStats {
    attachmentOutputCount: number;
    attachmentOutputSizeInBytes: number;
    attachmentStreamOutputCount: number;
    attachmentStreamOutputSizeInBytes: number;
    attachmentTombstoneOutputCount: number;
    attachmentTombstoneOutputSizeInBytes: number;
    documentTombstoneOutputCount: number;
    documentTombstoneOutputSizeInBytes: number;
    documentOutputCount: number;
    documentOutputSizeInBytes: number;
    revisionOutputCount: number;
    revisionOutputSizeInBytes: number;
    revisionTombstoneOutputCount: number;
    revisionTombstoneOutputSizeInBytes: number;
    counterOutputCount: number;
    counterOutputSizeInBytes: number;
    timeSeriesSegmentsOutputCount: number;
    timeSeriesSegmentsSizeInBytes: number;
    timeSeriesDeletedRangeOutputCount: number;
    timeSeriesDeletedRangeOutputSizeInBytes: number;
}
