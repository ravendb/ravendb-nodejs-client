import { AdvancedDocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";
import { DocumentType } from "../DocumentAbstractions";


export interface IDocumentQueryBuilder {
    documentQuery<TEntity extends object>(opts: AdvancedDocumentQueryOptions<TEntity>): IDocumentQuery<TEntity>;

    documentQuery<TEntity extends object>(documentType: DocumentType<TEntity>): IDocumentQuery<TEntity>;
}