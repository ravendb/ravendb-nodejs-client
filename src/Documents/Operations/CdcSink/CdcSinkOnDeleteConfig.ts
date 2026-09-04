/**
 * Controls how DELETE events are handled for a CDC Sink table (root or embedded).
 * When null (the default), DELETE events are processed normally - root documents are deleted,
 * embedded items are removed from the parent's array/map/value.
 */
export interface CdcSinkOnDeleteConfig {
    /**
     * Optional JavaScript patch that runs when a DELETE event is received.
     *
     * For root tables: this = the existing document, $row = raw CDC row (DELETE event data).
     * For embedded tables: this = the parent document, $row = the embedded row's DELETE event data.
     *
     * The patch runs before the delete is applied. Whether the delete proceeds afterward
     * depends on the ignoreDeletes flag:
     * - ignoreDeletes = false (default): patch runs, then delete proceeds.
     * - ignoreDeletes = true: patch runs, delete is skipped.
     */
    patch?: string;

    /**
     * When true, the DELETE operation is not applied - the document/item is kept.
     * If a patch is also set, the patch runs first, then the delete is skipped.
     * If no patch is set, the DELETE event is silently discarded.
     *
     * Use cases:
     * - Archive pattern: set ignoreDeletes = true with a patch that marks the
     *   document as archived (e.g., setting an Archived flag).
     * - Append-only data (e.g., audit logs) where rows should never be removed.
     * - When the embedded table's primary key doesn't include the join column to
     *   the parent and you don't want to set up REPLICA IDENTITY FULL (PostgreSQL-specific;
     *   SQL Server CDC always includes all tracked columns in change rows).
     */
    ignoreDeletes?: boolean;
}
