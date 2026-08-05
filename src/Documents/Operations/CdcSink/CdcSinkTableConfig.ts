import { CdcColumnMapping } from "./CdcColumnMapping.js";
import { CdcSinkEmbeddedTableConfig } from "./CdcSinkEmbeddedTableConfig.js";
import { CdcSinkLinkedTableConfig } from "./CdcSinkLinkedTableConfig.js";
import { CdcSinkOnDeleteConfig } from "./CdcSinkOnDeleteConfig.js";

/**
 * Maps a single source SQL table to a RavenDB collection: column mappings,
 * primary key, optional transform patch, delete handling, and embedded/linked tables.
 */
export interface CdcSinkTableConfig {
    /**
     * RavenDB collection name (e.g., "Orders").
     */
    collectionName: string;

    /**
     * SQL schema name (e.g., "dbo", "public").
     */
    sourceTableSchema?: string;

    /**
     * SQL table name (e.g., "orders").
     */
    sourceTableName: string;

    /**
     * Column mappings defining how SQL columns are stored in the RavenDB document.
     * Each entry maps a SQL column to a property or an attachment.
     */
    columns: CdcColumnMapping[];

    /**
     * Primary key column names, used for document ID generation.
     */
    primaryKeyColumns: string[];

    /**
     * Optional JavaScript transformation patch.
     * Runs on the document after column mapping and embedded operations have been applied.
     * Available variables:
     *   this = the document AFTER column mapping has been applied (already contains the new values from the CDC row),
     *   $row = the raw CDC row with all columns as-is from the source database,
     *   $old = the document as it was stored in RavenDB BEFORE this CDC event was processed (null for inserts).
     */
    patch?: string;

    /**
     * Controls how DELETE events are handled for this table.
     * When null (default), deletes are processed normally (document is deleted).
     * See CdcSinkOnDeleteConfig for archive, audit, and ignore patterns.
     */
    onDelete?: CdcSinkOnDeleteConfig;

    /**
     * When true, this table is skipped: no initial load and no change capture.
     */
    disabled?: boolean;

    /**
     * Tables embedded as nested objects/arrays within this collection's documents.
     */
    embeddedTables?: CdcSinkEmbeddedTableConfig[];

    /**
     * Tables referenced by document ID link within this collection's documents.
     */
    linkedTables?: CdcSinkLinkedTableConfig[];
}
