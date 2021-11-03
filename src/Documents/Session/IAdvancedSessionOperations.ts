import { StreamQueryStatistics } from "../Session/StreamQueryStatistics";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { ServerNode } from "../../Http/ServerNode";
import { ICommandData } from "../Commands/CommandData";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentsChanges } from "./DocumentsChanges";
import { EntityToJson } from "./EntityToJson";
import { IMetadataDictionary } from "./IMetadataDictionary";
import { SessionEventsEmitter } from "./SessionEvents";
import { TransactionMode } from "./TransactionMode";
import { IEagerSessionOperations } from "./Operations/Lazy/IEagerSessionOperations";
import { ILazySessionOperations } from "./Operations/Lazy/ILazySessionOperations";
import { IAttachmentsSessionOperations } from "./IAttachmentsSessionOperations";
import { IRevisionsSessionOperations } from "./IRevisionsSessionOperations";
import { IClusterTransactionOperations } from "./IClusterTransactionOperations";
import { DocumentType } from "../DocumentAbstractions";
import { IRawDocumentQuery } from "./IRawDocumentQuery";
import { SessionInfo, SessionLoadStartingWithOptions } from "./IDocumentSession";
import { IDocumentQuery } from "./IDocumentQuery";
import { JavaScriptArray } from "./JavaScriptArray";
import { DocumentResultStream } from "./DocumentResultStream";
import * as stream from "readable-stream";
import { IDocumentQueryBuilder } from "./IDocumentQueryBuilder";
import { IGraphDocumentQuery } from "./IGraphDocumentQuery";
import { JavaScriptMap } from "./JavaScriptMap";
import { ClassConstructor } from "../../Types";
import { ConditionalLoadResult } from "./ConditionalLoadResult";

export type StreamQueryStatisticsCallback = (stats: StreamQueryStatistics) => void;

export interface IAdvancedSessionOperations extends IAdvancedDocumentSessionOperations, IDocumentQueryBuilder {

    /**
     *  Access the eager operations
     */
    eagerly: IEagerSessionOperations;

    /**
     * Access the lazy operations
     */
    lazily: ILazySessionOperations;

    /**
     * Access the attachments operations
     */
    attachments: IAttachmentsSessionOperations;

    /**
     * Access the revisions operations
     */
    revisions: IRevisionsSessionOperations;

    /**
     * Access cluster transaction operations
     */
    clusterTransaction: IClusterTransactionOperations;

    /**
     * Updates entity with latest changes from server
     */
    refresh<TEntity extends object>(entity: TEntity): Promise<void>;

    /**
     * Query the specified index using provided raw query
     */

    rawQuery<TResult extends object>(query: string, documentType?: DocumentType<TResult>): IRawDocumentQuery<TResult>;

    graphQuery<TResult extends object>(query: string, documentType?: DocumentType<TResult>): IGraphDocumentQuery<TResult>;

    exists(id: string): Promise<boolean>;

    loadStartingWith<T extends object>(idPrefix: string, opts: SessionLoadStartingWithOptions<T>): Promise<T[]>;

    loadStartingWith<T extends object>(idPrefix: string): Promise<T[]>;

    increment<TEntity extends object, UValue>(id: string, path: string, valueToAdd: UValue): void;

    increment<TEntity extends object, UValue>(entity: TEntity, path: string, valueToAdd: UValue): void;

    patch<TEntity extends object, UValue>(id: string, path: string, value: UValue): void;

    patch<TEntity extends object, UValue>(entity: TEntity, path: string, value: UValue): void;

    patchArray<TEntity extends object, UValue>(
        id: string, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;

    patchArray<TEntity extends object, UValue>(
        entity: TEntity, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;

    patchObject<TEntity extends object, TKey, TValue>(
        entity: TEntity, pathToObject: string, mapAdder: (map: JavaScriptMap<TKey, TValue>) => void): void;

    patchObject<TEntity extends object, TKey, TValue>(
        id: string, pathToObject: string, mapAdder: (map: JavaScriptMap<TKey, TValue>) => void): void;

    addOrPatch<TEntity extends object, UValue>(id: string, entity: TEntity, pathToObject: string, value: UValue): void;

    addOrPatchArray<TEntity extends object, UValue>(
        id: string, entity: TEntity, pathToObject: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;

    addOrIncrement<TEntity extends object, UValue>(id: string, entity: TEntity, pathToObject: string, valToAdd: UValue): void;

    // tslint:enable:max-line-length

    /**
     *  Returns the results of a query directly into stream
     */
    streamInto<T extends object>(query: IDocumentQuery<T>, writable: stream.Writable): Promise<void>;

    /**
     * Returns the results of a query directly into stream
     */
    streamInto<T extends object>(query: IRawDocumentQuery<T>, writable: stream.Writable): Promise<void>;

    loadIntoStream(
        ids: string[], writable: stream.Writable): Promise<void>;

    loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable): Promise<void>;

    loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable,
        opts: SessionLoadStartingWithOptions<TEntity>): Promise<void>;

    /**
     * Stream the results on the query to the client.
     *
     * Does NOT track the entities in the session, and will not include changes there when saveChanges() is called
     */
    stream<T extends object>(query: IDocumentQuery<T>): Promise<DocumentResultStream<T>>;

    /**
     * Stream the results on the query to the client.
     *
     * Does NOT track the entities in the session, and will not include changes there when saveChanges() is called
     */
    stream<T extends object>(
        query: IDocumentQuery<T>,
        streamQueryStats: StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>>;

    /**
     * Stream the results on the query to the client.
     *
     * Does NOT track the entities in the session, and will not include changes there when saveChanges() is called
     */
    stream<T extends object>(query: IRawDocumentQuery<T>)
        : Promise<DocumentResultStream<T>>;

    /**
     * Stream the results on the query to the client.
     *
     * Does NOT track the entities in the session, and will not include changes there when saveChanges() is called
     */
    stream<T extends object>(
        query: IRawDocumentQuery<T>,
        streamQueryStats: StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>>;

    /**
     * Stream the results on the query to the client.
     *
     * Does NOT track the entities in the session, and will not include changes there when saveChanges() is called
     */
    stream<T extends object>(idPrefix: string)
        : Promise<DocumentResultStream<T>>;

    /**
     * Stream the results on the query to the client.
     *
     * Does NOT track the entities in the session, and will not include changes there when saveChanges() is called
     */
    stream<T extends object>(idPrefix: string, opts: SessionLoadStartingWithOptions<T>)
        : Promise<DocumentResultStream<T>>;

    /**
     * Loads the specified entity with the specified id and changeVector.
     * If the entity is loaded into the session, the tracked entity will be returned otherwise the entity will be loaded only if it is fresher then the provided changeVector.
     * @param id Identifier of a entity that will be conditional loaded.
     * @param changeVector Change vector of a entity that will be conditional loaded.
     * @param clazz Result class
     */
    conditionalLoad<T extends object>(id: string, changeVector: string, clazz: DocumentType<T>): Promise<ConditionalLoadResult<T>>;
}

export interface ReplicationBatchOptions {
    timeout?: number;
    throwOnTimeout?: boolean;
    replicas?: number;
    majority?: boolean;
}

export interface IndexBatchOptions {
    timeout?: number;
    throwOnTimeout?: boolean;
    indexes?: string[];
}

export interface IAdvancedDocumentSessionOperations extends SessionEventsEmitter {

    /**
     * The document store associated with this session
     */
    documentStore: IDocumentStore;

    /**
     * Allow extensions to provide additional state per session
     */
    externalState: Map<string, object>;

    getCurrentSessionNode(): Promise<ServerNode>;

    requestExecutor: RequestExecutor;
    
    sessionInfo: SessionInfo;

    /**
     * Gets a value indicating whether any of the entities tracked by the session has changes.
     */
    hasChanges(): boolean;

    maxNumberOfRequestsPerSession: number;

    /**
     * Gets the number of requests for this session
     */
    numberOfRequests: number;
    /**
     * Gets the store identifier for this session.
     * The store identifier is the identifier for the particular RavenDB instance.
     */
    storeIdentifier: string;

    /**
     * Gets value indicating whether the session should use optimistic concurrency.
     * When set to true, a check is made so that a change made behind the session back would fail
     * and raise ConcurrencyException
     */
    useOptimisticConcurrency: boolean;

    /**
     * Clears this instance.
     * Remove all entities from the delete queue and stops tracking changes for all entities.
     */
    clear(): void;

    /**
     * Defer commands to be executed on saveChanges()
     */
    defer(...commands: ICommandData[]): void;

    /**
     * Evicts the specified entity from the session.
     * Remove the entity from the delete queue and stops tracking changes for this entity.
     */
    evict<TEntity extends object>(entity: TEntity): void;

    /**
     * Gets the document id for the specified entity.
     *
     *  This function may return null if the entity isn't tracked by the session, or if the entity is
     *   a new entity with an ID that should be generated on the server.
     */
    getDocumentId(entity: object): string;

    /**
     * Gets the metadata for the specified entity.
     * If the entity is transient, it will load the metadata from the store
     * and associate the current state of the entity with the metadata from the server.
     */
    getMetadataFor<T extends object>(instance: T): IMetadataDictionary;

    /**
     * Gets change vector for the specified entity.
     * If the entity is transient, it will load the metadata from the store
     * and associate the current state of the entity with the metadata from the server.
     */
    getChangeVectorFor<T extends object>(instance: T): string;

    /**
     * Gets all the counter names for the specified entity.
     */
    getCountersFor<T extends object>(instance: T): string[];

    /**
     * Gets all time series names for the specified entity.
     * @param instance The instance
     */
    getTimeSeriesFor<T extends object>(instance: T): string[];

    /**
     * Gets last modified date for the specified entity.
     * If the entity is transient, it will load the metadata from the store
     * and associate the current state of the entity with the metadata from the server.
     */
    getLastModifiedFor<T extends object>(instance: T): Date;

    /**
     * Determines whether the specified entity has changed.
     */
    hasChanged(entity: object): boolean;

    /**
     * Returns whether a document with the specified id is loaded in the
     * current session
     */
    isLoaded(id: string): boolean;

    /**
     * Mark the entity as one that should be ignore for change tracking purposes,
     * it still takes part in the session, but is ignored for SaveChanges.
     */
    ignoreChangesFor(entity: object): void;

    /**
     * Returns all changes for each entity stored within session.
     * Including name of the field/property that changed, its old and new value and change type.
     */
    whatChanged(): { [id: string]: DocumentsChanges[] };

    /**
     * SaveChanges will wait for the changes made to be replicates to `replicas` nodes
     */
    waitForReplicationAfterSaveChanges();

    /**
     * SaveChanges will wait for the changes made to be replicates to `replicas` nodes
     */
    waitForReplicationAfterSaveChanges(opts: ReplicationBatchOptions);

    /**
     * SaveChanges will wait for the indexes to catch up with the saved changes
     */
    waitForIndexesAfterSaveChanges();

    /**
     * SaveChanges will wait for the indexes to catch up with the saved changes
     */
    waitForIndexesAfterSaveChanges(opts: IndexBatchOptions);

    entityToJson: EntityToJson;

    /**
     * Overwrite the existing transaction mode for the current session.
     */
    transactionMode: TransactionMode; 
}
