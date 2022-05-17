import { Lazy } from "../Lazy";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IDisposable } from "../../Types/Contracts";
import { DocumentType } from "../DocumentAbstractions";
import { ClassConstructor, EntitiesCollectionObject, ObjectTypeDescriptor } from "../../Types";
import { IAdvancedSessionOperations } from "./IAdvancedSessionOperations";
import { ILoaderWithInclude } from "./Loaders/ILoaderWithInclude";
import { DocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";
import { IIncludeBuilder } from "./Loaders/IIncludeBuilder";
import { ISessionDocumentCounters } from "./ISessionDocumentCounters";
import { ISessionDocumentTimeSeries } from "./ISessionDocumentTimeSeries";
import { ISessionDocumentTypedTimeSeries } from "./ISessionDocumentTypedTimeSeries";
import { ISessionDocumentRollupTypedTimeSeries } from "./ISessionDocumentRollupTypedTimeSeries";
import { TimeSeriesRange } from "../Operations/TimeSeries/TimeSeriesRange";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { SessionOptions } from "./SessionOptions";
import { throwError } from "../../Exceptions";
import { StringUtil } from "../../Utility/StringUtil";
import CurrentIndexAndNode from "../../Http/CurrentIndexAndNode";
import { HashCalculator } from "../Queries/HashCalculator";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { AbstractCommonApiForIndexes } from "../Indexes/AbstractCommonApiForIndexes";
import { AbstractTimeSeriesRange } from "../Operations/TimeSeries/AbstractTimeSeriesRange";

export class SessionInfo {
    private static _clientSessionIdCounter: number = 0;

    private _sessionId: number;
    private _sessionIdUsed: boolean;
    private readonly _loadBalancerContextSeed: number;
    private _canUseLoadBalanceBehavior: boolean;
    private readonly _session: InMemoryDocumentSessionOperations;

    public lastClusterTransactionIndex: number;
    public noCaching: boolean;

    public constructor(session: InMemoryDocumentSessionOperations, options: SessionOptions, documentStore: DocumentStoreBase) {
        if (!documentStore) {
            throwError("InvalidArgumentException", "DocumentStore cannot be null");
        }

        if (!session) {
            throwError("InvalidArgumentException", "Session cannot be null");
        }

        this._session = session;
        this._loadBalancerContextSeed = session.requestExecutor.conventions.loadBalancerContextSeed;
        this._canUseLoadBalanceBehavior = session.conventions.loadBalanceBehavior === "UseSessionContext"
            && !!session.conventions.loadBalancerPerSessionContextSelector;

        this.lastClusterTransactionIndex = documentStore.getLastTransactionIndex(session.databaseName);

        this.noCaching = options.noCaching;
    }

    public incrementRequestCount(): void {
        this._session.incrementRequestCount();
    }

    public setContext(sessionKey: string) {
        if (StringUtil.isNullOrWhitespace(sessionKey)) {
            throwError("InvalidArgumentException", "Session key cannot be null or whitespace.");
        }

        this._setContextInternal(sessionKey);

        this._canUseLoadBalanceBehavior = this._canUseLoadBalanceBehavior
            || this._session.conventions.loadBalanceBehavior === "UseSessionContext";

    }

    private _setContextInternal(sessionKey: string) {
        if (this._sessionIdUsed) {
            throwError("InvalidOperationException",
                "Unable to set the session context after it has already been used. " +
                "The session context can only be modified before it is utilized.");
        }

        if (!sessionKey) {
            this._sessionId = ++SessionInfo._clientSessionIdCounter;
        } else {
            const hash = new HashCalculator();
            hash.write(sessionKey);
            hash.write(this._loadBalancerContextSeed);
            const buffer = Buffer.from(hash.getHash());
            // tslint:disable-next-line:no-bitwise
            this._sessionId = (buffer[0] << 16) + (buffer[1] << 8) + buffer[2];
        }
    }

    public async getCurrentSessionNode(requestExecutor: RequestExecutor) {
        let result: CurrentIndexAndNode;

        if (requestExecutor.conventions.loadBalanceBehavior === "UseSessionContext") {
            if (this._canUseLoadBalanceBehavior) {
                result = await requestExecutor.getNodeBySessionId(this.getSessionId());
            }
        }

        switch (requestExecutor.conventions.readBalanceBehavior) {
            case "None":
                result = await requestExecutor.getPreferredNode();
                break;
            case "RoundRobin":
                result = await requestExecutor.getNodeBySessionId(this.getSessionId());
                break;
            case "FastestNode":
                result = await requestExecutor.getFastestNode();
                break;
            default:
                throwError("InvalidArgumentException", requestExecutor.conventions.readBalanceBehavior);
        }

        return result.currentNode;
    }

    public getSessionId(): number {
        if (!this._sessionId) {
            let context: string;
            const selector = this._session.conventions.loadBalancerPerSessionContextSelector;
            if (selector) {
                context = selector(this._session.databaseName);
            }

            this._setContextInternal(context);
        }

        this._sessionIdUsed = true;
        return this._sessionId;
    }

    public canUseLoadBalanceBehavior() {
        return this._canUseLoadBalanceBehavior;
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
    load<TEntity extends object>(id: string): Promise<TEntity | null>;

    /**
     * Loads the entity with the specified id.
     */
    load<TEntity extends object>(id: string, documentType?: DocumentType<TEntity>): Promise<TEntity | null>;

    /**
     * Loads the entity with the specified id.
     */
    load<TEntity extends object>(id: string, options?: LoadOptions<TEntity>): Promise<TEntity | null>;

    /**
     * Loads multiple entities with the specified ids.
     */
    load<TEntity extends object>(ids: string[]): Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities with the specified ids.
     */
    load<TEntity extends object>(ids: string[], documentType?: DocumentType<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities with the specified ids.
     */
    load<TEntity extends object>(ids: string[], options?: LoadOptions<TEntity>):
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
    store<TEntity extends object>(document: TEntity): Promise<void>;

    /**
     * Stores the specified dynamic entity, under the specified id.
     */
    store<TEntity extends object>(document: TEntity, id?: string): Promise<void>;

    /**
     * Stores the specified dynamic entity, under the specified id.
     */
    store<TEntity extends object>(document: TEntity, id?: string, documentType?: DocumentType<TEntity>): Promise<void>;

    /**
     * Stores entity in session with given id and forces concurrency check with given change-vector (see options).
     */
    store<TEntity extends object>(document: TEntity, id?: string, options?: StoreOptions<TEntity>): Promise<void>;

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
     * Queries collection or index.
     */
    query<T extends object>(opts: DocumentQueryOptions<T>): IDocumentQuery<T>;

    /**
     * Queries collection. Collection name is determined from documentType using document store conventions.
     */
    query<T extends object>(documentType: DocumentType<T>): IDocumentQuery<T>;

    query<T extends object>(documentType: DocumentType<T>, index: new () => AbstractCommonApiForIndexes): IDocumentQuery<T>;

    countersFor(documentId: string): ISessionDocumentCounters;

    countersFor(entity: object): ISessionDocumentCounters;


    timeSeriesFor(documentId: string, name: string): ISessionDocumentTimeSeries;
    timeSeriesFor(entity:any, name: string): ISessionDocumentTimeSeries;

    timeSeriesFor<T extends object>(documentId: string, clazz: ObjectTypeDescriptor<T>): ISessionDocumentTypedTimeSeries<T>;
    timeSeriesFor<T extends object>(documentId: string, name: string, clazz: ObjectTypeDescriptor<T>): ISessionDocumentTypedTimeSeries<T>;
    timeSeriesFor<T extends object>(entity: object, clazz: ObjectTypeDescriptor<T>): ISessionDocumentTypedTimeSeries<T>;
    timeSeriesFor<T extends object>(entity: object, name: string, clazz: ObjectTypeDescriptor<T>): ISessionDocumentTypedTimeSeries<T>;

    timeSeriesRollupFor<T extends object>(entity: object, policy: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(entity: object, policy: string, raw: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(documentId: string, policy: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(documentId: string, policy: string, raw: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
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
    timeSeriesIncludes?: AbstractTimeSeriesRange[];
    compareExchangeValueIncludes?: string[];
    revisionIncludesByChangeVector?: string[];
    revisionsToIncludeByDateTime?: Date;
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
