import { CdcColumnMapping } from "./CdcColumnMapping.js";
import { CdcSinkLinkedTableConfig } from "./CdcSinkLinkedTableConfig.js";
import { CdcSinkOnDeleteConfig } from "./CdcSinkOnDeleteConfig.js";
import { CdcSinkRelationType } from "./CdcSinkRelationType.js";

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
 * A table embedded as nested objects/arrays within the parent collection's documents.
 */
export class CdcSinkEmbeddedTableConfig {
    public sourceTableSchema: string = null;
    public sourceTableName: string = null;
    public propertyName: string = null;
    public columns: CdcColumnMapping[] = [];
    public primaryKeyColumns: string[] = [];
    public joinColumns: string[] = [];
    public type: CdcSinkRelationType = "Array";
    public patch: string = null;
    public onDelete?: CdcSinkOnDeleteConfig;
    public caseSensitiveKeys: boolean = false;
    public embeddedTables: CdcSinkEmbeddedTableConfig[] = [];
    public linkedTables: CdcSinkLinkedTableConfig[] = [];

    public toJSON() {
        return {
            sourceTableSchema: this.sourceTableSchema ?? null,
            sourceTableName: this.sourceTableName ?? null,
            propertyName: this.propertyName ?? null,
            columns: (this.columns ?? []).map(x => toColumnJson(x)),
            primaryKeyColumns: this.primaryKeyColumns ?? [],
            joinColumns: this.joinColumns ?? [],
            type: this.type,
            patch: this.patch ?? null,
            ...(this.onDelete ? { onDelete: this.onDelete } : {}),
            caseSensitiveKeys: this.caseSensitiveKeys,
            embeddedTables: this.embeddedTables ?? [],
            linkedTables: this.linkedTables ?? []
        };
    }
}
