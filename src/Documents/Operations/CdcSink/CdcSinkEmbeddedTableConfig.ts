import { CdcColumnMapping } from "./CdcColumnMapping.js";
import { CdcSinkLinkedTableConfig } from "./CdcSinkLinkedTableConfig.js";
import { CdcSinkOnDeleteConfig } from "./CdcSinkOnDeleteConfig.js";
import { CdcSinkRelationType } from "./CdcSinkRelationType.js";

/**
 * A table embedded as a nested object/array within a CDC Sink collection's documents.
 */
export interface CdcSinkEmbeddedTableConfig {
    /**
     * SQL schema name.
     */
    sourceTableSchema?: string;

    /**
     * SQL table name.
     */
    sourceTableName: string;

    /**
     * Property name in the parent document (e.g., "Lines").
     */
    propertyName: string;

    /**
     * Column mappings defining how SQL columns are stored in the embedded object.
     * Each entry maps a SQL column to a property or an attachment.
     */
    columns: CdcColumnMapping[];

    /**
     * Primary key columns of this embedded table.
     * Used for matching items within arrays/maps during updates and deletes.
     */
    primaryKeyColumns: string[];

    /**
     * Foreign key columns that join this table to its parent.
     */
    joinColumns: string[];

    /**
     * How the embedded data is stored:
     * "Array" = JSON array, "Map" = JSON object keyed by PK, "Value" = single object.
     */
    type: CdcSinkRelationType;

    /**
     * Optional JavaScript patch that runs on the PARENT document after this embedded operation
     * (i.e., after the embedded item has already been inserted/updated/removed in the array/map/value).
     * Available variables:
     *   this = the parent document AFTER the embedded operation has been applied,
     *   $row = the raw CDC row for the embedded table with all columns as-is from the source database,
     *   $old = the embedded item as it existed BEFORE this CDC event modified it (null for inserts).
     */
    patch?: string;

    /**
     * Controls how DELETE events are handled for this embedded table.
     * When null (default), deletes remove the embedded item from the parent's array/map/value.
     * See CdcSinkOnDeleteConfig for archive, audit, and ignore patterns.
     */
    onDelete?: CdcSinkOnDeleteConfig;

    /**
     * Whether primary key matching and map key comparison are case-sensitive.
     * When false (default), string PK values and map keys are compared using ordinal case-insensitive comparison.
     * When true, comparison is ordinal case-sensitive.
     */
    caseSensitiveKeys?: boolean;

    /**
     * Nested embedded tables (deep nesting).
     * Requires that the nested table has a denormalized FK to the root table.
     */
    embeddedTables?: CdcSinkEmbeddedTableConfig[];

    /**
     * Tables referenced by document ID link within this embedded table's items.
     * Works identically to root-level linkedTables: FK columns in the embedded row
     * are resolved to document ID references in the target collection.
     */
    linkedTables?: CdcSinkLinkedTableConfig[];
}
