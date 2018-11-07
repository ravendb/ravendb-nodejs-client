import { Lazy } from "../Lazy";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IDisposable } from "../../Types/Contracts";
import { AbstractCallback } from "../../Types/Callbacks";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentType } from "../DocumentAbstractions";
import { EntitiesCollectionObject, ObjectTypeDescriptor } from "../../Types";
import { IAdvancedSessionOperations } from "./IAdvancedSessionOperations";
import { ILoaderWithInclude } from "./Loaders/ILoaderWithInclude";
import { DocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";
import { IIncludeBuilder } from "./Loaders/IIncludeBuilder";
import { ISessionDocumentCounters } from "./ISessionDocumentCounters";
import { SessionEventsEmitter } from "./SessionEvents";

export class SessionInfo {
    private _sessionId: number;
    private _lastClusterTransactionIndex: number;
    private _noCaching: boolean;

    public get sessionId() {
        return this._sessionId;
    }

    public get lastClusterTransactionIndex() {
        return this._lastClusterTransactionIndex;
    }

    public set lastClusterTransactionIndex(value) {
        this._lastClusterTransactionIndex = value;
    }

    public get noCaching() {
        return this._noCaching;
    }

    public constructor(sessionId: number);
    public constructor(sessionId: number, lastClusterTransactionIndex: number, noCaching: boolean);
    public constructor(sessionId: number, lastClusterTransactionIndex?: number, noCaching?: boolean) {
        this._sessionId = sessionId;
        this._lastClusterTransactionIndex = lastClusterTransactionIndex || null;
        this._noCaching = noCaching || false;
    }
}

export type ConcurrencyCheckMode = "Auto" | "Forced" | "Disabled";

export interface IDocumentSession extends IDisposable {

    /**
     * Get the accessor for advanced operations
     *
     * Those operations are rarely needed, and have been moved to a separate
     * property to avoid cluttering the API
     */
    advanced: IAdvancedSessionOperations;

    /**
     * Loads entity with the specified id.
     */
    load<TEntity extends object>(
        id: string,
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Loads the entity with the specified id.
     */
    load<TEntity extends object>(
        id: string,
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Loads the entity with the specified id.
     */
    load<TEntity extends object>(
        id: string,
        options?: LoadOptions<TEntity>,
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;

    /**
     * Loads multiple entities with the specified ids.
     */
    load<TEntity extends object>(
        ids: string[],
        callback?: AbstractCallback<EntitiesCollectionObject<TEntity>>): Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities with the specified ids.
     */
    load<TEntity extends object>(
        ids: string[],
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities with the specified ids.
     */
    load<TEntity extends object>(
        ids: string[],
        options?: LoadOptions<TEntity>,
        callback?: AbstractCallback<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Marks the specified entity for deletion. The entity will be deleted when DocumentSession.saveChanges is called.
     * WARNING: This method will not emit beforeDelete event!
     */
    delete<TEntity extends object>(
        id: string): Promise<void>;

    /**
     * Marks the specified entity for deletion. The entity will be deleted when DocumentSession.saveChanges is called.
     * WARNING: This method will not emit beforeDelete event!
     */
    delete<TEntity extends object>(
        id: string, expectedChangeVector: string): Promise<void>;

    /**
     * Marks the specified entity for deletion. The entity will be deleted when IDocumentSession.saveChanges is called.
     */
    delete<TEntity extends object>(
        entity: TEntity): Promise<void>;

    /**
     * Stores entity in session, extracts Id from entity using Conventions or generates new one if it is not available.
     * Forces concurrency check if the Id is not available during extraction.
     */
    store<TEntity extends object>(
        document: TEntity, callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Stores the specified dynamic entity, under the specified id.
     */
    store<TEntity extends object>(
        document: TEntity,
        id?: string,
        callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Stores the specified dynamic entity, under the specified id.
     */
    store<TEntity extends object>(
        document: TEntity,
        id?: string,
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Stores entity in session with given id and forces concurrency check with given change-vector (see options).
     */
    store<TEntity extends object>(
        document: TEntity,
        id?: string,
        options?: StoreOptions<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;

    /**
     * Begin a load while including the specified path
     * Path in documents in which server should look for a 'referenced' documents.
     */
    include(path: string): ILoaderWithInclude;

    /**
     * Saves all the pending changes to the server.
     */
    saveChanges(): Promise<void>;

    /**
     * Saves all the pending changes to the server.
     */
    saveChanges(callback: AbstractCallback<void>): Promise<void>;

    /**
     * Queries collection or index.
     */
    query<T extends object>(opts: DocumentQueryOptions<T>): IDocumentQuery<T>;

    /**
     * Queries collection. Collection name is determined from documentType using document store conventions.
     */
    query<T extends object>(documentType: DocumentType<T>): IDocumentQuery<T>;

    countersFor(documentId: string): ISessionDocumentCounters;

    countersFor(entity: object): ISessionDocumentCounters;
}

/**
 * session.store() options
 */
export interface StoreOptions<T extends object> {
    /**
     * Type of document being stored
     */
    documentType?: DocumentType<T>;

    /**
     * Change vector used for forcing concurrency check.
     */
    changeVector?: string;
}

/**
 * session.load() options
 */
export interface LoadOptions<T extends object> {
    /**
     * Type of document to load
     */
    documentType?: DocumentType<T>;

    /**
     * Ids of included documents
     */
    includes?: string[] | ((includesBuilder: IIncludeBuilder) => void);

    /**
     * Expected change vector
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

export interface SessionLoadInternalParameters<TResult extends object> {
    includes?: string[]; 
    documentType?: DocumentType<TResult>;
    counterIncludes?: string[];
    includeAllCounters?: boolean;
}

export interface IDocumentSessionImpl extends IDocumentSession {

    conventions: DocumentConventions;

    loadInternal<TResult extends object>(
        ids: string[], opts: SessionLoadInternalParameters<TResult>):
        Promise<EntitiesCollectionObject<TResult>>;

    lazyLoadInternal<TResult extends object>(
        ids: string[],
        includes: string[],
        clazz: ObjectTypeDescriptor<TResult>): Lazy<EntitiesCollectionObject<TResult>>;
}
