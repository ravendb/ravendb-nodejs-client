import {IRavenObject, RevisionsCollectionObject} from "../../Types";
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
     * @param id Document id
     */
    getFor<TEntity extends object>(id: string): Promise<TEntity[]>;

    /**
     * Returns all previous document revisions for specified document
     *  ordered by most recent revisions first.
     * @param id Document id
     * @param callback Callback
     */
    getFor<TEntity extends object>(id: string, callback: AbstractCallback<TEntity[]>): Promise<TEntity[]>;

    /**
     * Returns previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     * @param id Document id
     * @param options Paging and result class options
     */
    getFor<TEntity extends object>(
        id: string, options: SessionRevisionsOptions<TEntity>): Promise<TEntity[]>;

    /**
     * Returns previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     * @param id Document id
     * @param options Paging and result class options
     * @param callback Callback
     */
    getFor<TEntity extends object>(
        id: string,
        options: SessionRevisionsOptions<TEntity>,
        callback: AbstractCallback<TEntity[]>): Promise<TEntity[]>;

    /**
     * Returns metadata of all previous document revisions for specified document
     *  ordered by most recent revisions first.
     * @param id Document id
     */
    getMetadataFor(id: string): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of all previous document revisions for specified document
     *  ordered by most recent revisions first.
     * @param id Document id
     * @param callback Callback
     */
    getMetadataFor(id: string, callback: AbstractCallback<MetadataAsDictionary[]>): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     * @param id Document id
     * @param options Paging and result class options
     */
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     * @param id Document id
     * @param options Paging and result class options
     * @param callback Callback
     */
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions,
                   callback: AbstractCallback<MetadataAsDictionary[]>): Promise<MetadataAsDictionary[]>;

    /**
     * Returns a document revision by change vector.
     * @param changeVector Change vector
     */
    get<TEntity extends object>(changeVector: string): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     * @param changeVector Change vector
     * @param callback Callback
     */
    get<TEntity extends object>(changeVector: string, callback: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     * @param changeVector Change vector
     * @param documentType The type of document
     */
    get<TEntity extends object>(changeVector: string, documentType: DocumentType<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     * @param changeVector Change vector
     * @param documentType The type of document
     * @param callback Callback
     */
    get<TEntity extends object>(changeVector: string, documentType: DocumentType<TEntity>,
                                callback: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vectors.
     * @param changeVectors Change vectors
     */
    get<TEntity extends object>(changeVectors: string[]): Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     * @param changeVectors Change vectors
     * @param callback Callback
     */
    get<TEntity extends object>(changeVectors: string[],
                                callback: AbstractCallback<Map<string, TEntity>>)
        : Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     * @param changeVectors Change vectors
     * @param documentType The type of document
     */
    get<TEntity extends object>(changeVectors: string[],
                                documentType: DocumentType<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     * @param changeVectors Change vectors
     * @param documentType The type of document
     * @param callback Callback
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
