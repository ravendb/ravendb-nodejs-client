import { Lazy } from "../Lazy";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IDisposable } from "../../Types/Contracts";
import { AbstractCallback } from "../../Types/Callbacks";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentType } from "../DocumentAbstractions";
import { EntitiesCollectionObject, ObjectTypeDescriptor } from "../../Types";
import { IAdvancedSessionOperations} from "./IAdvancedSessionOperations";
import { ILoaderWithInclude } from "./Loaders/ILoaderWithInclude";
import { DocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";

export class SessionInfo {
    public sessionId: number;

    public constructor(sessionId?: number) {
        this.sessionId = sessionId;
    }
}

export type ConcurrencyCheckMode = "Auto" | "Forced" | "Disabled";
export interface IDocumentSession extends IDisposable {

    /**
     * Get the accessor for advanced operations
     *
     * Those operations are rarely needed, and have been moved to a separate
     * property to avoid cluttering the API
     * @returns Advanced session operations
     */
    advanced: IAdvancedSessionOperations;

    /**
     * Loads entity with the specified id.
     * 
     * @template TEntity 
     * @param {string} id 
     * @param {AbstractCallback<TEntity>} [callback] 
     * @returns {Promise<TEntity>} 
     * @memberof IDocumentSession
     */
    load<TEntity extends object>(
        id: string, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Loads the entity with the specified id.
     * 
     * @template TEntity 
     * @param {string} id 
     * @param {DocumentType<TEntity>} [documentType] 
     * @param {AbstractCallback<TEntity>} [callback] 
     * @returns {Promise<TEntity>} 
     * @memberof IDocumentSession
     */
    load<TEntity extends object>(
        id: string, 
        documentType?: DocumentType<TEntity>, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Loads the entity with the specified id.
     * 
     * @template TEntity 
     * @param {string} id 
     * @param {LoadOptions<TEntity>} [options] 
     * @param {AbstractCallback<TEntity>} [callback] 
     * @returns {Promise<TEntity>} 
     * @memberof IDocumentSession
     */
    load<TEntity extends object>(
        id: string, 
        options?: LoadOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Loads multiple entities with the specified ids.
     * 
     * @template TEntity 
     * @param {string[]} ids 
     * @param {AbstractCallback<EntitiesCollectionObject<TEntity>>} [callback] 
     * @returns {Promise<EntitiesCollectionObject<TEntity>>} 
     * @memberof IDocumentSession
     */
    load<TEntity extends object>(
        ids: string[], 
        callback?: AbstractCallback<EntitiesCollectionObject<TEntity>>): Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities with the specified ids.
     * 
     * @template TEntity 
     * @param {string[]} ids 
     * @param {DocumentType<TEntity>} [documentType] 
     * @param {AbstractCallback<TEntity>} [callback] 
     * @returns {Promise<EntitiesCollectionObject<TEntity>>} 
     * @memberof IDocumentSession
     */
    load<TEntity extends object>(
        ids: string[], 
        documentType?: DocumentType<TEntity>, 
        callback?: AbstractCallback<TEntity>): 
        Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities with the specified ids.
     * 
     * @template TEntity 
     * @param {string[]} ids 
     * @param {LoadOptions<TEntity>} [options] 
     * @param {AbstractCallback<TEntity>} [callback] 
     * @returns {Promise<EntitiesCollectionObject<TEntity>>} 
     * @memberof IDocumentSession
     */
    load<TEntity extends object>(
        ids: string[], 
        options?: LoadOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): 
        Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Marks the specified entity for deletion. The entity will be deleted when DocumentSession.saveChanges is called.
     * WARNING: This method will not emit beforeDelete event!
     * 
     * @template TEntity 
     * @param {string} id 
     * @memberof IDocumentSession
     */
    delete<TEntity extends object>(
        id: string): Promise<void>;

    /**
     * Marks the specified entity for deletion. The entity will be deleted when DocumentSession.saveChanges is called.
     * WARNING: This method will not emit beforeDelete event!
     * 
     * @template TEntity 
     * @param {string} id 
     * @param {string} expectedChangeVector 
     * @memberof IDocumentSession
     */
    delete<TEntity extends object>(
        id: string, expectedChangeVector: string): Promise<void>;

    /**
     * Marks the specified entity for deletion. The entity will be deleted when IDocumentSession.saveChanges is called.
     * 
     * @template TEntity 
     * @param {TEntity} entity 
     * @memberof IDocumentSession
     */
    delete<TEntity extends object>(
        entity: TEntity): Promise<void>;

    /**
     * Stores entity in session, extracts Id from entity using Conventions or generates new one if it is not available.
     * Forces concurrency check if the Id is not available during extraction.
     * 
     * @template TEntity 
     * @param {TEntity} document Entity to store
     * @param {AbstractCallback<void>} [callback] 
     * @returns {Promise<void>} 
     * @memberof IDocumentSession
     */
    store<TEntity extends object>(
        document: TEntity, callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Stores the specified dynamic entity, under the specified id.
     * 
     * @template TEntity 
     * @param {TEntity} document 
     * @param {string} [id] Id to store this entity under. 
     *                      If other entity exists with the same id it will be overwritten.
     * @param {AbstractCallback<void>} [callback] 
     * @returns {Promise<void>} 
     * @memberof IDocumentSession
     */
    store<TEntity extends object>(
        document: TEntity, 
        id?: string, 
        callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Stores the specified dynamic entity, under the specified id.
     * 
     * @template TEntity 
     * @param {TEntity} document 
     * @param {string} [id] 
     * @param {DocumentType<TEntity>} [documentType] 
     * @param {AbstractCallback<void>} [callback] 
     * @returns {Promise<void>} 
     * @memberof IDocumentSession
     */
    store<TEntity extends object>(
        document: TEntity,
        id?: string,
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Stores entity in session with given id and forces concurrency check with given change-vector (see options).
     * 
     * @template TEntity 
     * @param {TEntity} document 
     * @param {string} [id] 
     * @param {StoreOptions<TEntity>} [options] 
     * @param {AbstractCallback<void>} [callback] 
     * @returns {Promise<void>} 
     * @memberof IDocumentSession
     */
    store<TEntity extends object>(
        document: TEntity,
        id?: string,
        options?: StoreOptions<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Begin a load while including the specified path
     * Path in documents in which server should look for a 'referenced' documents.
     * @param path Path to include
     * @returns Loader with includes
     */
    include(path: string): ILoaderWithInclude;

    /**
     * Saves all the pending changes to the server.
     * 
     * @returns {Promise<void>} 
     * @memberof IDocumentSession
     */
    saveChanges(): Promise<void>;

    /**
     * Saves all the pending changes to the server.
     * 
     * @param {AbstractCallback<void>} callback 
     * @returns {Promise<void>} 
     * @memberof IDocumentSession
     */
    saveChanges(callback: AbstractCallback<void>): Promise<void>;

    /**
     * Queries collection or index.
     * 
     * @template T 
     * @param {DocumentQueryOptions<T>} opts 
     * @returns {IDocumentQuery<T>} 
     * @memberof IDocumentSession
     */
    query<T extends object>(opts: DocumentQueryOptions<T>): IDocumentQuery<T>;

    /**
     * Queries collection. Collection name is determined from documentType using document store conventions.
     * 
     * @template T 
     * @param {DocumentType<T>} documentType 
     * @returns {IDocumentQuery<T>} 
     * @memberof IDocumentSession
     */
    query<T extends object>(documentType: DocumentType<T>): IDocumentQuery<T>;
}

export interface ISessionOptions {
    database?: string;
    requestExecutor?: RequestExecutor;
}

/**
 * session.store() options
 * 
 * @export
 * @interface StoreOptions
 * @template T 
 */
export interface StoreOptions<T extends object> {
    /**
     * Type of document being stored
     * 
     * @type {DocumentType<T>}
     * @memberof StoreOptions
     */
    documentType?: DocumentType<T>;

    /**
     * Change vector used for forcing concurrency check.
     * 
     * @type {string}
     * @memberof StoreOptions
     */
    changeVector?: string;
}

/**
 * session.load() options
 * 
 * @export
 * @interface LoadOptions
 * @template T 
 */
export interface LoadOptions<T extends object> {
    /**
     * Type of document to load
     * 
     * @type {DocumentType<T>}
     * @memberof LoadOptions
     */
    documentType?: DocumentType<T>;

    /**
     * Ids of included documents
     * 
     * @type {string[]}
     * @memberof LoadOptions
     */
    includes?: string[];

    /**
     * Expected change vector
     * 
     * @type {string}
     * @memberof LoadOptions
     */
    expectedChangeVector?: string;
}

export interface SessionLoadStartingWithOptions<T extends object> extends StartingWithOptions {
    matches?: string;
    start?: number;
    pageSize?: number;
    exclude?: string;
    startAfter?: string;
    documentType?: DocumentType<T>;
    streamResults?: boolean;
}

export interface StartingWithOptions {
    matches?: string;
    start?: number;
    pageSize?: number;
    exclude?: string;
    startAfter?: string;
}

export interface IDocumentSessionImpl extends IDocumentSession {

    conventions: DocumentConventions;

    loadInternal<TResult extends object>(
        ids: string[], includes: string[], clazz: ObjectTypeDescriptor<TResult>): 
        Promise<EntitiesCollectionObject<TResult>>;

     lazyLoadInternal<TResult extends object>(
        ids: string[], 
        includes: string[], 
        clazz: ObjectTypeDescriptor<TResult>): Lazy<EntitiesCollectionObject<TResult>>;
}
