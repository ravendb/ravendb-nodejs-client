import {DocumentType} from "../DocumentAbstractions";

export interface DocumentQueryOptions<T extends object> {
    collection?: string;
    indexName?: string;
    documentType?: DocumentType<T>;
}

export interface AdvancedDocumentQueryOptions<T extends object> extends DocumentQueryOptions<T> {
    isMapReduce?: boolean;
}
