import { IOperationProgress } from "../Operations/IOperationProgress.js";
import { IOperationResult } from "../Operations/IOperationResult.js";

export interface SmugglerProgressBase extends IOperationProgress {
    databaseRecord: DatabaseRecordProgress;
    documents: CountsWithSkippedCountAndLastEtagAndAttachments;
    revisionDocuments: CountsWithSkippedCountAndLastEtagAndAttachments;
    tombstones: CountsWithLastEtag;
    conflicts: CountsWithLastEtag;
    identities: CountsWithLastEtag;
    indexes: Counts;
    compareExchange: CountsWithLastEtag;
    subscriptions: Counts;
    replicationHubCertificates: Counts;
    counters: CountsWithSkippedCountAndLastEtag;
    timeSeries: CountsWithSkippedCountAndLastEtag;
    compareExchangeTombstones: Counts;
    timeSeriesDeletedRanges: CountsWithSkippedCountAndLastEtag;
}

export interface SmugglerResult extends SmugglerProgressBase, IOperationResult {
    /** Not sent for restore results. */
    messages?: string[];
    /** Time span in the server format, e.g. "00:00:01.2345678". */
    elapsed: string;
    legacyLastDocumentEtag?: string;
    legacyLastAttachmentEtag?: string;
}

export interface SmugglerProgress extends SmugglerProgressBase {
    message: string;
}

export interface Counts {
    /** ISO date string as sent by the server. */
    startTime: string;
    processed: boolean;
    readCount: number;
    skipped: boolean;
    erroredCount: number;
    sizeInBytes: number;
}

export interface CountsWithLastEtag extends Counts {
    lastEtag: number;
}

export interface CountsWithLastEtagAndAttachments extends CountsWithLastEtag {
    attachments: Counts;
}

export interface CountsWithSkippedCountAndLastEtag extends CountsWithLastEtag {
    skippedCount: number;
}

export interface CountsWithSkippedCountAndLastEtagAndAttachments extends CountsWithLastEtagAndAttachments {
    skippedCount: number;
}

export interface FileCounts {
    currentFileName: string;
    currentFile: number;
    fileCount: number;
}

/** The server sends only the flags that are true. */
export interface DatabaseRecordProgress extends Counts {
    sortersUpdated?: boolean;
    analyzersUpdated?: boolean;
    sinkPullReplicationsUpdated?: boolean;
    hubPullReplicationsUpdated?: boolean;
    ravenEtlsUpdated?: boolean;
    sqlEtlsUpdated?: boolean;
    snowflakeEtlsUpdated?: boolean;
    embeddingsGenerationsUpdated?: boolean;
    genAiTasksUpdated?: boolean;
    externalReplicationsUpdated?: boolean;
    periodicBackupsUpdated?: boolean;
    conflictSolverConfigUpdated?: boolean;
    schemaValidationConfigUpdated?: boolean;
    timeSeriesConfigurationUpdated?: boolean;
    documentsCompressionConfigurationUpdated?: boolean;
    revisionsConfigurationUpdated?: boolean;
    expirationConfigurationUpdated?: boolean;
    refreshConfigurationUpdated?: boolean;
    dataArchivalConfigurationUpdated?: boolean;
    remoteAttachmentsConfigurationUpdated?: boolean;
    ravenConnectionStringsUpdated?: boolean;
    sqlConnectionStringsUpdated?: boolean;
    snowflakeConnectionStringsUpdated?: boolean;
    aiConnectionStringsUpdated?: boolean;
    aiAgentsUpdated?: boolean;
    clientConfigurationUpdated?: boolean;
    unusedDatabaseIdsUpdated?: boolean;
    lockModeUpdated?: boolean;
    olapEtlsUpdated?: boolean;
    olapConnectionStringsUpdated?: boolean;
    elasticSearchEtlsUpdated?: boolean;
    elasticSearchConnectionStringsUpdated?: boolean;
    postreSQLConfigurationUpdated?: boolean;
    queueEtlsUpdated?: boolean;
    queueConnectionStringsUpdated?: boolean;
    queueSinksUpdated?: boolean;
    indexesHistoryUpdated?: boolean;
}
