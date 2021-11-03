import { SessionRevisionsMetadataOptions } from "./IRevisionsSessionOperations";
import { DocumentType } from "../DocumentAbstractions";
import { Lazy } from "../Lazy";
import { MetadataAsDictionary } from "../../Mapping/MetadataAsDictionary";
import { RevisionsCollectionObject } from "../../Types";

/**
 * Revisions advanced synchronous Lazy session operations
 */
export interface ILazyRevisionsOperations {
    /**
     * Returns all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(id: string): Lazy<TEntity[]>;

    /**
     * Returns previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(
        id: string, options: LazySessionRevisionsOptions<TEntity>): Lazy<TEntity[]>;

    /**
     * Returns metadata of all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string): Lazy<MetadataAsDictionary[]>;

    /**
     * Returns metadata of previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions): Lazy<MetadataAsDictionary[]>;

    /**
     * Returns a document revision by date.
     */
    get<TEntity extends object>(id: string, date: Date): Lazy<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string): Lazy<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string, documentType: DocumentType<TEntity>): Lazy<TEntity>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[]): Lazy<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[],
                                documentType: DocumentType<TEntity>)
        : Lazy<RevisionsCollectionObject<TEntity>>;
}


export interface LazySessionRevisionsOptions<T extends object> {
    start?: number;
    pageSize?: number;
    documentType?: DocumentType<T>;
}

export interface LazySessionRevisionsMetadataOptions {
    start?: number;
    pageSize?: number;
}
