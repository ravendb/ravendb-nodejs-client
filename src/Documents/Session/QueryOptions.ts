import { DocumentType } from "../DocumentAbstractions";
import { IAbstractIndexCreationTask } from "../Indexes/IAbstractIndexCreationTask";
import { ClassConstructor } from "../../Types";

export interface DocumentQueryOptions<T extends object> {
    collection?: string;
    indexName?: string;
    index?: ClassConstructor<IAbstractIndexCreationTask>;
    documentType?: DocumentType<T>;
}

export interface AdvancedDocumentQueryOptions<T extends object> extends DocumentQueryOptions<T> {
    isMapReduce?: boolean;
}
