import { CdcColumnMapping } from "./CdcColumnMapping.js";
import { CdcSinkEmbeddedTableConfig } from "./CdcSinkEmbeddedTableConfig.js";
import { CdcSinkLinkedTableConfig } from "./CdcSinkLinkedTableConfig.js";
import { CdcSinkOnDeleteConfig } from "./CdcSinkOnDeleteConfig.js";

// Plain-object column mappings carry no toJSON; normalize them the way the class serializes itself.
function toColumnJson(column: CdcColumnMapping | Record<string, unknown>): unknown {
    if (column && typeof (column as any).toJSON === "function") {
        return column;
    }

    const json = { ...column };
    if (json.type === "Default") {
        delete json.type;
    }

    json.column = json.column ?? null;
    json.name = json.name ?? null;
    return json;
}

/**
 * Maps a source SQL table to a RavenDB collection.
 */
export class CdcSinkTableConfig {
    public collectionName: string = null;
    public sourceTableSchema: string = null;
    public sourceTableName: string = null;
    public columns: CdcColumnMapping[] = [];
    public primaryKeyColumns: string[] = [];
    public patch: string = null;
    public onDelete?: CdcSinkOnDeleteConfig;
    public disabled: boolean = false;
    public embeddedTables: CdcSinkEmbeddedTableConfig[] = [];
    public linkedTables: CdcSinkLinkedTableConfig[] = [];

    public toJSON() {
        return {
            collectionName: this.collectionName ?? null,
            sourceTableSchema: this.sourceTableSchema ?? null,
            sourceTableName: this.sourceTableName ?? null,
            columns: (this.columns ?? []).map(x => toColumnJson(x)),
            primaryKeyColumns: this.primaryKeyColumns ?? [],
            patch: this.patch ?? null,
            ...(this.onDelete ? { onDelete: this.onDelete } : {}),
            disabled: this.disabled,
            embeddedTables: this.embeddedTables ?? [],
            linkedTables: this.linkedTables ?? []
        };
    }
}
