/**
 * A table referenced by document-ID link within the parent collection's documents.
 */
export class CdcSinkLinkedTableConfig {
    public sourceTableSchema: string = null;
    public sourceTableName: string = null;
    public propertyName: string = null;
    public joinColumns: string[] = [];
    public linkedCollectionName: string = null;
}
