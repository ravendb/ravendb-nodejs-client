import { RevisionsCollectionObject } from "../../Types";
import { DocumentType } from "../DocumentAbstractions";
import { MetadataAsDictionary } from "../../Mapping/MetadataAsDictionary";
import { ForceRevisionStrategy } from "./ForceRevisionStrategy";
import { ILazySessionOperations } from "./Operations/Lazy/ILazySessionOperations";
import { ILazyRevisionsOperations } from "./ILazyRevisionsOperations";

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
     * Returns previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getFor<TEntity extends object>(
        id: string, options: SessionRevisionsOptions<TEntity>): Promise<TEntity[]>;

    /**
     * Returns metadata of all previous document revisions for specified document
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string): Promise<MetadataAsDictionary[]>;

    /**
     * Returns metadata of previous document revisions for specified document (with optional paging)
     *  ordered by most recent revisions first.
     */
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions): Promise<MetadataAsDictionary[]>;

    /**
     * Returns a document revision by date.
     */
    get<TEntity extends object>(id: string, date: Date): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string): Promise<TEntity>;

    /**
     * Returns a document revision by change vector.
     */
    get<TEntity extends object>(changeVector: string, documentType: DocumentType<TEntity>): Promise<TEntity>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[]): Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Returns a document revision by change vectors.
     */
    get<TEntity extends object>(changeVectors: string[],
                                documentType: DocumentType<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;

    /**
     * Make the session create a revision for the specified entity.
     * Can be used with tracked entities only.
     * Revision will be created Even If:
     *
     * 1. Revisions configuration is Not set for the collection
     * 2. Document was Not modified
     */
    forceRevisionCreationFor<T extends object>(entity: T): void;

    /**
     * Make the session create a revision for the specified entity.
     * Can be used with tracked entities only.
     * Revision will be created Even If:
     *
     * 1. Revisions configuration is Not set for the collection
     * 2. Document was Not modified
     */
    forceRevisionCreationFor<T extends object>(entity: T, strategy: ForceRevisionStrategy): void;

    /**
     * Make the session create a revision for the specified document id.
     * Revision will be created Even If:
     *
     * 1. Revisions configuration is Not set for the collection
     * 2. Document was Not modified
     * @param id Document id to use
     */
    forceRevisionCreationFor(id: string);

    /**
     * Make the session create a revision for the specified document id.
     * Revision will be created Even If:
     *
     * 1. Revisions configuration is Not set for the collection
     * 2. Document was Not modified
     * @param id Document id to use
     * @param strategy Strategy to use
     */
    forceRevisionCreationFor(id: string, strategy: ForceRevisionStrategy): void;


    /**
     * Returns the number of revisions for specified document.
     * @param id Document id to use
     */
    getCountFor(id: string): Promise<number>;

    /**
     * Access the lazy revisions operations
     */
    lazily(): ILazyRevisionsOperations;
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
