
export interface SqlEtlTable {
    tableName: string;
    documentIdColumn: string;
    insertOnlyMode: boolean;
}

export function serializeSqlEtlTable(table: SqlEtlTable): object {
    return {
        TableName: table.tableName,
        DocumentIdColumn: table.documentIdColumn,
        InsertOnlyMode: table.insertOnlyMode
    }
}