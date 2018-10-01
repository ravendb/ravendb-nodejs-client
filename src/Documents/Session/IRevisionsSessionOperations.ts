import {RevisionsCollectionObject} from "../../Types";
import {DocumentType} from "../DocumentAbstractions";
import {MetadataAsDictionary} from "../../Mapping/MetadataAsDictionary";
import {AbstractCallback} from "../../Types/Callbacks";

/**
 * Revisions advanced session operations
 */
export interface IRevisionsSessionOperations {

    /**
     * Returns all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(id: string): Promise<TEntity[]>;

    /**
     * Returns all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(id: string, callback: AbstractCallback<TEntity[]>): Promise<TEntity[]>;

    /**
     * Returns previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(
        id: string, options: SessionRevisionsOptions<TEntity>): Promise<TEntity[]>;

    /**
     * Returns previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(
        id: string,
        options: SessionRevisionsOptions<TEntity>,
        callback: AbstractCallback<TEntity[]>): Promise<TEntity[]>;

    /**
     * Returns metadata of all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string, callback: AbstractCallback<MetadataAsDictionary[]>): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions,
                   callback: AbstractCallback<MetadataAsDictionary[]>): Promise<MetadataAsDictionary[]>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string, callback: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string, documentType: DocumentType<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string, documentType: DocumentType<TEntity>,
                                callback: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[]): Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[],
                                callback: AbstractCallback<Map<string, TEntity>>)
        : Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[],
                                documentType: DocumentType<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[],
                                documentType: DocumentType<TEntity>,
                                callback: AbstractCallback<Map<string, TEntity>>)
        : Promise<RevisionsCollectionObject<TEntity>>;
}

export interface SessionRevisionsOptions<T extends object> {
    start?: number;
    pageSize?: number;
    documentType?: DocumentType<T>;
}

export interface SessionRevisionsMetadataOptions {
    start?: number;
    pageSize?: number;
}
