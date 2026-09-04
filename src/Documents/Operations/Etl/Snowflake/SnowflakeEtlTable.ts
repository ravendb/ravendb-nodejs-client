
export interface SnowflakeEtlTable {
    tableName: string;
    documentIdColumn: string;
    insertOnlyMode: boolean;
}

export function serializeSnowflakeEtlTable(table: SnowflakeEtlTable) {
    return {
        TableName: table.tableName,
        DocumentIdColumn: table.documentIdColumn,
        InsertOnlyMode: table.insertOnlyMode
    }
}
