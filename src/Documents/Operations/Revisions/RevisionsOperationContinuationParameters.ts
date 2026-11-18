/**
 * State needed to resume an interrupted revisions operation from where a previous run left off.
 * Populate it from lastProcessedEtags, etagBarriersUsed and nodeTags of the previous run's result.
 * Etags are node-local, so the resumed operation must run on the same node: use forNode(nodeTag).
 */
export interface RevisionsOperationContinuationParameters {
    /**
     * Starting etags keyed by database name ("Northwind", or "Northwind$0" per shard).
     */
    startFromEtags?: Record<string, number>;
    /**
     * Etag barriers of the previous run keyed by database name. Must match its etagBarriersUsed.
     */
    etagBarriers?: Record<string, number>;
    /**
     * Node tags of the previous run keyed by database name.
     * The server rejects the resumed operation when it runs on a different node.
     */
    nodeTags?: Record<string, string>;
}
