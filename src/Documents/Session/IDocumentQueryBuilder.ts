import { AdvancedDocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";
import { DocumentType } from "../DocumentAbstractions";
import { AbstractCommonApiForIndexes } from "../Indexes/AbstractCommonApiForIndexes";

export interface IDocumentQueryBuilder {
    documentQuery<TEntity extends object>(opts: AdvancedDocumentQueryOptions<TEntity>): IDocumentQuery<TEntity>;

    documentQuery<TEntity extends object>(documentType: DocumentType<TEntity>): IDocumentQuery<TEntity>;
    documentQuery<TEntity extends object>(documentType: DocumentType<TEntity>, index: new () => AbstractCommonApiForIndexes): IDocumentQuery<TEntity>;
}