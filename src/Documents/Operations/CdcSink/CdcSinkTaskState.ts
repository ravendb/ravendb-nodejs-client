/**
 * Collection name for CDC Sink state documents.
 */
export const CDC_SINK_STATE_COLLECTION_NAME = "@cdc-states";

/**
 * State document for a CDC Sink task, stored in the @cdc-states collection.
 * Tracks the last processed LSN and per-table initial load progress.
 */
export interface CdcSinkTaskState {
    /**
     * The last successfully processed Log Sequence Number (LSN) from the CDC stream.
     * Used to resume streaming after a restart.
     */
    lastLsn: string;

    /**
     * Per-table initial load state. Key is "schema.tableName".
     */
    tables: Record<string, CdcSinkTableLoadState>;

    /**
     * The name of the CDC Sink configuration this state belongs to.
     */
    configurationName: string;
}

/**
 * Per-table load state within a CDC Sink task state document.
 */
export interface CdcSinkTableLoadState {
    /**
     * Whether the initial full-table load has completed for this table.
     */
    initialLoadCompleted: boolean;

    /**
     * The last primary key values loaded during the initial load.
     * Used to resume an interrupted initial load.
     * Format: list of string representations of the PK column values (in PK column order).
     */
    lastKeyValues: string[];

    keyColumns: string[];
}

/**
 * Generates the document ID for a CDC Sink task's state document.
 * Configuration names are compared case-insensitively, but the document ID
 * preserves the original casing.
 */
export function getCdcSinkTaskStateDocumentId(configurationName: string): string {
    return `${CDC_SINK_STATE_COLLECTION_NAME}/${configurationName}`;
}
