
export interface SqlEtlTable {
    tableName: string;
    documentIdColumn: string;
    insertOnlyMode: boolean;
}