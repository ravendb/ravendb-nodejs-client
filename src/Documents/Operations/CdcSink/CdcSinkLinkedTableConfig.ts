/**
 * A table referenced by document ID link within a CDC Sink collection's documents.
 */
export interface CdcSinkLinkedTableConfig {
    /**
     * SQL schema name of the linked table.
     */
    sourceTableSchema?: string;

    /**
     * SQL table name of the linked table.
     */
    sourceTableName: string;

    /**
     * Property name in the document (e.g., "Customer").
     */
    propertyName: string;

    /**
     * Foreign key columns used to resolve the link.
     */
    joinColumns: string[];

    /**
     * Target collection name used for document ID generation
     * (e.g., "Customers" generates "Customers/ALFKI").
     */
    linkedCollectionName: string;
}
