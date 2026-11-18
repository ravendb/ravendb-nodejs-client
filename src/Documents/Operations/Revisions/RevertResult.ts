import { IOperationResult } from "../IOperationResult.js";

export interface OperationResult extends IOperationResult {
    scannedRevisions: number;
    scannedDocuments: number;
    warnings: Record<string, string>;
    /**
     * Highest etag scanned per database ("Northwind", or "Northwind$0" per shard).
     * Pass it as continuationParameters.startFromEtags to resume the operation.
     */
    lastProcessedEtags: Record<string, number>;
    /**
     * Etag barriers used during this run, keyed by database name.
     */
    etagBarriersUsed: Record<string, number>;
    /**
     * Node tags that processed each database, keyed by database name.
     */
    nodeTags: Record<string, string>;
}

export interface EnforceConfigurationResult extends OperationResult {
    removedRevisions: number;
}

export interface RevertResult extends OperationResult {
    revertedDocuments: number;
}
