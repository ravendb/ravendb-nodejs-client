import { EntityToJson } from "./EntityToJson";
import { IDisposable } from "../../Types/Contracts";
import { SessionInfo, ConcurrencyCheckMode, StoreOptions } from "./IDocumentSession";
import { IMetadataDictionary } from "./IMetadataDictionary";
import { ObjectTypeDescriptor, ClassConstructor, ServerResponse } from "../../Types";
import {
    SessionEventsEmitter,
    SessionBeforeStoreEventArgs,
    SessionBeforeDeleteEventArgs,
    BeforeConversionToDocumentEventArgs,
    AfterConversionToDocumentEventArgs,
    BeforeConversionToEntityEventArgs,
    AfterConversionToEntityEventArgs
} from "./SessionEvents";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { IDocumentStore } from "../IDocumentStore";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { DocumentsById, EntityInfo } from "./DocumentsById";
import { DocumentInfo } from "./DocumentInfo";
import { DocumentStoreBase } from "../DocumentStoreBase";
import {
    ICommandData,
    DeleteCommandData,
    SaveChangesData,
    PutCommandDataWithJson,
    CommandType
} from "../Commands/CommandData";
import { BatchPatchCommandData } from "../Commands/Batches/BatchPatchCommandData";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient";
import { tryGetConflict } from "../../Mapping/Json";
import { CONSTANTS, HEADERS } from "../../Constants";
import { DateUtil } from "../../Utility/DateUtil";
import { ObjectUtil } from "../../Utility/ObjectUtil";
import { IncludesUtil } from "./IncludesUtil";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentType } from "../DocumentAbstractions";
import { IdTypeAndName } from "../IdTypeAndName";
import { BatchOptions } from "../Commands/Batches/BatchOptions";
import { DocumentsChanges } from "./DocumentsChanges";
import { EventEmitter } from "events";
import { JsonOperation } from "../../Mapping/JsonOperation";
import { IRavenObject } from "../../Types/IRavenObject";
import { GetDocumentsCommand } from "../Commands/GetDocumentsCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { JsonSerializer } from "../../Mapping/Json/Serializer";
import { OperationExecutor } from "../Operations/OperationExecutor";
import { createMetadataDictionary } from "../../Mapping/MetadataAsDictionary";
import { IndexBatchOptions, ReplicationBatchOptions } from "./IAdvancedSessionOperations";
import { ILazyOperation } from "./Operations/Lazy/ILazyOperation";
import { TransactionMode } from "./TransactionMode";
import { CounterTracking } from "./CounterInternalTypes";
import { CaseInsensitiveKeysMap } from "../../Primitives/CaseInsensitiveKeysMap";
import { CaseInsensitiveStringSet } from "../../Primitives/CaseInsensitiveStringSet";
import { DocumentStore } from "../DocumentStore";
import { SessionOptions } from "./SessionOptions";
import { ClusterTransactionOperationsBase } from "./ClusterTransactionOperationsBase";
import { BatchCommandResult } from "./Operations/BatchCommandResult";
import { SessionOperationExecutor } from "../Operations/SessionOperationExecutor";
import { StringUtil } from "../../Utility/StringUtil";
import { Reference } from "../../Utility/Reference";
import { ForceRevisionStrategy } from "./ForceRevisionStrategy";
import { ForceRevisionCommandData } from "../Commands/Batches/ForceRevisionCommandData";
import { TimeSeriesRangeResult } from "../Operations/TimeSeries/TimeSeriesRangeResult";
import { DatesComparator, leftDate, rightDate } from "../../Primitives/DatesComparator";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry";
import { reviveTimeSeriesRangeResult } from "../Operations/TimeSeries/GetTimeSeriesOperation";

export abstract class InMemoryDocumentSessionOperations
    extends EventEmitter
    implements IDisposable, SessionEventsEmitter {

    protected _requestExecutor: RequestExecutor;

    private _operationExecutor: OperationExecutor;

    protected _pendingLazyOperations: ILazyOperation[] = [];

    protected static _instancesCounter: number = 0;

    private _hash = ++InMemoryDocumentSessionOperations._instancesCounter;

    private _disposed: boolean;

    protected _jsonSerializer: JsonSerializer = JsonSerializer.getDefaultForCommandPayload();

    private readonly _id: string;

    public get id() {
        return this._id;
    }

    protected _knownMissingIds: Set<string> = CaseInsensitiveStringSet.create();

    private _externalState: Map<string, object>;

    public disableAtomicDocumentWritesInClusterWideTransaction: boolean;

    private _transactionMode: TransactionMode;

    public get externalState() {
        if (!this._externalState) {
            this._externalState = new Map();
        }

        return this._externalState;
    }

    public getCurrentSessionNode(): Promise<ServerNode> {
        return this.sessionInfo.getCurrentSessionNode(this._requestExecutor);

    }

    public documentsById: DocumentsById = new DocumentsById();

    /**
     * map holding the data required to manage Counters tracking for RavenDB's Unit of Work
     */
    public get countersByDocId(): Map<string, CounterTracking> {
        if (!this._countersByDocId) {
            this._countersByDocId = CaseInsensitiveKeysMap.create();
        }

        return this._countersByDocId;
    }

    private _countersByDocId: Map<string, CounterTracking>;

    private _timeSeriesByDocId: Map<string, Map<string, TimeSeriesRangeResult[]>>;

    public get timeSeriesByDocId() {
        if (!this._timeSeriesByDocId) {
            this._timeSeriesByDocId = CaseInsensitiveKeysMap.create();
        }

        return this._timeSeriesByDocId;
    }

    public readonly noTracking: boolean;

    public idsForCreatingForcedRevisions: Map<string, ForceRevisionStrategy> = CaseInsensitiveKeysMap.create();

    public includedDocumentsById: Map<string, DocumentInfo> = CaseInsensitiveKeysMap.create();

    /**
     * Translate between an CV and its associated entity
     */
    public includeRevisionsByChangeVector: Map<string, DocumentInfo> = CaseInsensitiveKeysMap.create();

    /**
     * Translate between an ID and its associated entity
     */
    public includeRevisionsIdByDateTimeBefore: Map<string, Map<number, DocumentInfo>> = CaseInsensitiveKeysMap.create();

    public documentsByEntity: DocumentsByEntityHolder = new DocumentsByEntityHolder();

    public deletedEntities: DeletedEntitiesHolder = new DeletedEntitiesHolder();

    protected _documentStore: DocumentStoreBase;

    private readonly _databaseName: string;

    private _saveChangesOptions: BatchOptions;

    public get databaseName(): string {
        return this._databaseName;
    }

    public get documentStore(): IDocumentStore {
        return this._documentStore;
    }

    public get requestExecutor(): RequestExecutor {
        return this._requestExecutor;
    }

    public get sessionInfo(): SessionInfo {
        return this._sessionInfo;
    }

    public get operations() {
        if (!this._operationExecutor) {
            this._operationExecutor = new SessionOperationExecutor(this);
        }

        return this._operationExecutor;
    }

    private _numberOfRequests: number = 0;

    public get numberOfRequests() {
        return this._numberOfRequests;
    }

    public getNumberOfEntitiesInUnitOfWork() {
        return this.documentsByEntity.size;
    }

    public get storeIdentifier(): string {
        return `${this._documentStore.identifier};${this._databaseName}`;
    }

    public get conventions(): DocumentConventions {
        return this._requestExecutor.conventions;
    }

    public maxNumberOfRequestsPerSession: number;

    public useOptimisticConcurrency: boolean;

    protected _deferredCommands: ICommandData[] = [];

    // keys are produced with IdTypeAndName.keyFor() method
    public deferredCommandsMap: Map<string, ICommandData> = new Map();

    public get deferredCommands() {
        return this._deferredCommands;
    }

    public get deferredCommandsCount() {
        return this._deferredCommands.length;
    }

    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;

    public get generateEntityIdOnTheClient() {
        return this._generateEntityIdOnTheClient;
    }

    private readonly _entityToJson: EntityToJson;

    public get entityToJson() {
        return this._entityToJson;
    }

    protected _sessionInfo: SessionInfo;

    protected constructor(
        documentStore: DocumentStore,
        id: string,
        options: SessionOptions) {
        super();

        this._id = id;
        this._databaseName = options.database || documentStore.database;

        if (StringUtil.isNullOrWhitespace(this._databaseName)) {
            InMemoryDocumentSessionOperations._throwNoDatabase();
        }

        this._documentStore = documentStore;
        this._requestExecutor =
            options.requestExecutor || documentStore.getRequestExecutor(this._databaseName);

        this.noTracking = options.noTracking;

        this.useOptimisticConcurrency = this._requestExecutor.conventions.isUseOptimisticConcurrency();
        this.maxNumberOfRequestsPerSession = this._requestExecutor.conventions.maxNumberOfRequestsPerSession;
        this._generateEntityIdOnTheClient =
            new GenerateEntityIdOnTheClient(this._requestExecutor.conventions,
                (obj) => this._generateId(obj));
        this._entityToJson = new EntityToJson(this);

        this._sessionInfo = new SessionInfo(this, options, documentStore);
        this._transactionMode = options.transactionMode;
        this.disableAtomicDocumentWritesInClusterWideTransaction = options.disableAtomicDocumentWritesInClusterWideTransaction;
    }

    protected abstract _generateId(entity: object): Promise<string>;

    /**
     * Gets the metadata for the specified entity.
     */
    public getMetadataFor<T extends object>(instance: T): IMetadataDictionary {
        if (!instance) {
            throwError("InvalidOperationException", "Instance cannot be null or undefined.");
        }

        const documentInfo = this._getDocumentInfo(instance);
        return this._makeMetadataInstance(documentInfo);
    }

    /**
     * Gets all counter names for the specified entity.
     */
    public getCountersFor<T extends object>(instance: T): string[] {
        if (!instance) {
            throwError("InvalidArgumentException", "Instance cannot be null.");
        }

        const documentInfo = this._getDocumentInfo(instance);
        const countersArray = documentInfo.metadata[CONSTANTS.Documents.Metadata.COUNTERS] as string[];
        if (!countersArray) {
            return null;
        }

        return countersArray;
    }

    /**
     * Gets all time series names for the specified entity.
     * @param instance Entity
     */
    public getTimeSeriesFor<T extends object>(instance: T): string[] {
        if (!instance) {
            throwError("InvalidArgumentException", "Instance cannot be null");
        }

        const documentInfo = this._getDocumentInfo(instance);
        return documentInfo.metadata[CONSTANTS.Documents.Metadata.TIME_SERIES] || [];
    }

    private _makeMetadataInstance<T extends object>(docInfo: DocumentInfo): IMetadataDictionary {
        const metadataInstance = docInfo.metadataInstance;
        if (metadataInstance) {
            return metadataInstance;
        }

        const metadataAsJson = docInfo.metadata;
        const metadata = createMetadataDictionary({ raw: metadataAsJson });
        docInfo.entity[CONSTANTS.Documents.Metadata.KEY] = docInfo.metadataInstance = metadata;

        return metadata;
    }

    private _getDocumentInfo<T extends object>(instance: T): DocumentInfo {
        const documentInfo: DocumentInfo = this.documentsByEntity.get(instance);

        if (documentInfo) {
            return documentInfo;
        }

        let idRef;
        if (!this._generateEntityIdOnTheClient.tryGetIdFromInstance(
            instance, (_idRef) => idRef = _idRef)) {
            throwError("InvalidOperationException", "Could not find the document id for " + instance);
        }

        this._assertNoNonUniqueInstance(instance, idRef);

        throwError("InvalidArgumentException", "Document " + idRef + " doesn't exist in the session");
    }

    protected _assertNoNonUniqueInstance(entity: object, id: string): void {
        if (!id
            || id[id.length - 1] === "|"
            || id[id.length - 1] === this.conventions.identityPartsSeparator) {
            return;
        }

        const info: DocumentInfo = this.documentsById.getValue(id);
        if (!info || info.entity === entity) {
            return;
        }

        throwError("NonUniqueObjectException", "Attempted to associate a different object with id '" + id + "'.");
    }

    /**
     * Gets the Change Vector for the specified entity.
     * If the entity is transient, it will load the change vector from the store
     * and associate the current state of the entity with the change vector from the server.
     */
    public getChangeVectorFor<T extends object>(instance: T): string {
        if (!instance) {
            throwError("InvalidArgumentException", "Instance cannot be null or undefined.");
        }

        const documentInfo: DocumentInfo = this._getDocumentInfo(instance);
        const changeVector = documentInfo.metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
        if (changeVector) {
            return changeVector.toString() as string;
        }

        return null;
    }

    public getLastModifiedFor<T extends object>(instance: T): Date {
        if (!instance) {
            throwError("InvalidArgumentException", "Instance cannot be null or undefined.");
        }

        const documentInfo = this._getDocumentInfo(instance);
        const lastModified = documentInfo.metadata["@last-modified"];
        return DateUtil.default.parse(lastModified);
    }

    /**
     * Returns whether a document with the specified id is loaded in the
     * current session
     */
    public isLoaded(id: string): boolean {
        return this.isLoadedOrDeleted(id);
    }

    public isLoadedOrDeleted(id: string): boolean {
        const documentInfo = this.documentsById.getValue(id);
        return !!(documentInfo && (documentInfo.document || documentInfo.entity))
            || this.isDeleted(id)
            || this.includedDocumentsById.has(id);
    }

    /**
     * Returns whether a document with the specified id is deleted
     * or known to be missing
     */
    public isDeleted(id: string): boolean {
        return this._knownMissingIds.has(id);
    }

    /**
     * Gets the document id.
     */
    public getDocumentId(instance: object): string {
        if (!instance) {
            return null;
        }

        const value = this.documentsByEntity.get(instance);
        return value ? value.id : null;
    }

    public incrementRequestCount(): void {
        if (++this._numberOfRequests > this.maxNumberOfRequestsPerSession) {
            throwError("InvalidOperationException",
                `The maximum number of requests (${this.maxNumberOfRequestsPerSession}) allowed for this session has been reached.` +
                "Raven limits the number of remote calls that a session is allowed to make as an early warning system. Sessions are expected to be short lived, and " +
                "Raven provides facilities like load(string[] keys) to load multiple documents at once and batch saves (call SaveChanges() only once)." +
                "You can increase the limit by setting DocumentConvention.MaxNumberOfRequestsPerSession or MaxNumberOfRequestsPerSession, but it is" +
                "advisable that you'll look into reducing the number of remote calls first, since that will speed up your application significantly and result in a" +
                "more responsive application.");
        }
    }

    public checkIfAllChangeVectorsAreAlreadyIncluded(changeVectors: string[]): boolean {
        if (!this.includeRevisionsByChangeVector) {
            return false;
        }

        for (const cv of changeVectors) {
            if (!this.includeRevisionsByChangeVector.has(cv)) {
                return false;
            }
        }

        return true;
    }

    public checkIfRevisionByDateTimeBeforeAlreadyIncluded(id: string, dateTime: Date): boolean {
        if (!this.includeRevisionsIdByDateTimeBefore) {
            return false;
        }

        const dictionaryDateTimeToDocument = this.includeRevisionsIdByDateTimeBefore.get(id);
        return dictionaryDateTimeToDocument && dictionaryDateTimeToDocument.has(dateTime.getTime());
    }

    public checkIfIdAlreadyIncluded(ids: string[], includes: string[]): boolean {
        for (const id of ids) {
            if (this._knownMissingIds.has(id)) {
                continue;
            }

            // Check if document was already loaded, the check if we've received it through include
            let documentInfo: DocumentInfo = this.documentsById.getValue(id);
            if (!documentInfo) {
                documentInfo = this.includedDocumentsById.get(id);
                if (!documentInfo) {
                    return false;
                }
            }

            if (!documentInfo.entity && !documentInfo.document) {
                return false;
            }

            if (!includes) {
                continue;
            }

            for (const include of includes) {
                let hasAll: boolean = true;

                IncludesUtil.include(documentInfo.document, include, (includeId: string) => {
                    hasAll = hasAll && this.isLoaded(includeId);
                });

                if (!hasAll) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Tracks the entity inside the unit of work
     */
    public trackEntity<T extends object>(
        entityType: ObjectTypeDescriptor<T>, documentFound: DocumentInfo): T;
    public trackEntity<T extends object>(
        entityType: ObjectTypeDescriptor<T>,
        id: string,
        document: object,
        metadata: object,
        noTracking: boolean): object;
    public trackEntity<T extends object>(
        entityType: ObjectTypeDescriptor<T>,
        idOrDocumentInfo: string | DocumentInfo,
        document?: object,
        metadata?: object,
        noTracking?: boolean): T {

        let id: string;
        if (TypeUtil.isObject(idOrDocumentInfo)) {
            const info = idOrDocumentInfo as DocumentInfo;
            return this.trackEntity(entityType, info.id, info.document, info.metadata, this.noTracking) as T;
        } else {
            id = idOrDocumentInfo as string;
        }

        // if noTracking is session-wide then we want to override the passed argument
        noTracking = this.noTracking || noTracking;

        if (!id) {
            return this._deserializeFromTransformer(entityType, null, document, false) as T;
        }

        let docInfo: DocumentInfo = this.documentsById.getValue(id);
        if (docInfo) {
            // the local instance may have been changed, we adhere to the current Unit of Work
            // instance, and return that, ignoring anything new.

            if (!docInfo.entity) {
                docInfo.entity = this.entityToJson.convertToEntity(entityType, id, document, !noTracking);
                this._makeMetadataInstance(docInfo);
            }

            if (!noTracking) {
                this.includedDocumentsById.delete(id);
                this.documentsByEntity.put(docInfo.entity, docInfo);
            }

            this.onAfterConversionToEntityInvoke(id, docInfo.document, docInfo.entity);

            return docInfo.entity as T;
        }

        docInfo = this.includedDocumentsById.get(id);
        if (docInfo) {
            if (!docInfo.entity) {
                docInfo.entity = this.entityToJson.convertToEntity(entityType, id, document, !noTracking);
                this._makeMetadataInstance(docInfo);
            }

            if (!noTracking) {
                this.includedDocumentsById.delete(id);
                this.documentsById.add(docInfo);
                this.documentsByEntity.put(docInfo.entity, docInfo);
            }

            this.onAfterConversionToEntityInvoke(id, docInfo.document, docInfo.entity);

            return docInfo.entity as T;
        }

        const entity = this.entityToJson.convertToEntity(entityType, id, document, !noTracking);

        const changeVector = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
        if (!changeVector) {
            throwError("InvalidOperationException", "Document " + id + " must have Change Vector.");
        }

        if (!noTracking) {
            const newDocumentInfo: DocumentInfo = new DocumentInfo();
            newDocumentInfo.id = id;
            newDocumentInfo.document = document;
            newDocumentInfo.metadata = metadata;
            newDocumentInfo.entity = entity;
            newDocumentInfo.changeVector = changeVector;

            this.documentsById.add(newDocumentInfo);
            this.documentsByEntity.put(entity, newDocumentInfo);
            this._makeMetadataInstance(newDocumentInfo);
        }

        this.onAfterConversionToEntityInvoke(id, document, entity);

        return entity as T;
    }

    public registerExternalLoadedIntoTheSession(info: DocumentInfo): void {
        if (this.noTracking) {
            return;
        }

        const existing = this.documentsById.getValue(info.id);
        if (existing) {
            if (existing.entity === info.entity) {
                return;
            }

            throwError(
                "InvalidOperationException",
                "The document " + info.id + " is already in the session with a different entity instance.");
        }

        const existingEntity = this.documentsByEntity.get(info.entity);
        if (existingEntity) {
            if (StringUtil.equalsIgnoreCase(existingEntity.id, info.id)) {
                return;
            }

            throwError(
                "InvalidOperationException",
                "Attempted to load an entity with id "
                + info.id
                + ", but the entity instance already exists in the session with id: " + existing.id);
        }

        this.documentsByEntity.put(info.entity, info);
        this.documentsById.add(info);
        this.includedDocumentsById.delete(info.id);
     }

    private _deserializeFromTransformer(clazz: ObjectTypeDescriptor, id: string, document: object, trackEntity: boolean): object {
        const entity = this.entityToJson.convertToEntity(clazz, id, document, trackEntity);
        this.onAfterConversionToEntityInvoke(id, document, entity);
        return entity;
    }

    public registerIncludes(includes: object): void {
        if (this.noTracking) {
            return;
        }

        if (!includes) {
            return;
        }

        for (const fieldName of Object.keys(includes)) {
            const fieldValue = includes[fieldName];

            if (TypeUtil.isNullOrUndefined(fieldValue)) {
                continue;
            }

            const newDocumentInfo = DocumentInfo.getNewDocumentInfo(fieldValue);
            if (tryGetConflict(newDocumentInfo.metadata)) {
                continue;
            }

            this.includedDocumentsById.set(newDocumentInfo.id, newDocumentInfo);
        }
    }

    public registerRevisionIncludes(revisionIncludes: any[]) {
        if (this.noTracking) {
            return;
        }

        if (!revisionIncludes) {
            return;
        }

        if (!this.includeRevisionsByChangeVector) {
            this.includeRevisionsByChangeVector = CaseInsensitiveKeysMap.create();
        }

        if (!this.includeRevisionsIdByDateTimeBefore) {
            this.includeRevisionsIdByDateTimeBefore = CaseInsensitiveKeysMap.create();
        }

        for (const obj of revisionIncludes) {
            if (!obj) {
                continue;
            }

            const json = obj;
            const id = json.Id;
            const changeVector = json.ChangeVector;
            const beforeAsText = json.Before;
            const dateTime = beforeAsText ? DateUtil.utc.parse(beforeAsText) : null;
            const revision = json.Revision;

            this.includeRevisionsByChangeVector.set(changeVector, DocumentInfo.getNewDocumentInfo(revision));

            if (dateTime && !StringUtil.isNullOrWhitespace(id)) {
                const map = new Map<number, DocumentInfo>();

                this.includeRevisionsIdByDateTimeBefore.set(id, map);

                const documentInfo = new DocumentInfo();
                documentInfo.document = revision;
                map.set(dateTime.getTime(), documentInfo);
            }
        }
    }

    public registerMissingIncludes(results: object[], includes: object, includePaths: string[]): void {
        if (this.noTracking) {
            return;
        }

        if (!includePaths || !includePaths.length) {
            return;
        }

        for (const result of results) {
            for (const include of includePaths) {
                if (include === CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME) {
                    continue;
                }

                IncludesUtil.include(result, include, id => {
                    if (!id) {
                        return;
                    }

                    if (this.isLoaded(id)) {
                        return;
                    }

                    const document = includes[id];
                    if (document) {
                        const metadata = document.get(CONSTANTS.Documents.Metadata.KEY);

                        if (tryGetConflict(metadata)) {
                            return;
                        }
                    }

                    this.registerMissing(id);
                });
            }
        }
    }

    public registerMissing(idOrIds: string | string[]): void {
        if (this.noTracking) {
            return;
        }

        if (TypeUtil.isArray(idOrIds)) {
            for (const id of idOrIds) {
                this._knownMissingIds.add(id);
            }
        } else {
            this._knownMissingIds.add(idOrIds);
        }
    }

    public unregisterMissing(id: string) {
        this._knownMissingIds.delete(id);
    }

    public registerCounters(
        resultCounters: object,
        countersToInclude: { [key: string]: string[] }): void;
    public registerCounters(
        resultCounters: object,
        ids: string[],
        countersToInclude: string[],
        gotAll: boolean): void;
    public registerCounters(
        resultCounters: object,
        idsOrCountersToInclude: string[] | { [key: string]: string[] },
        countersToInclude?: string[],
        gotAll?: boolean) {
            if (Array.isArray(idsOrCountersToInclude)) {
                this._registerCountersWithIdsList(resultCounters, idsOrCountersToInclude, countersToInclude, gotAll);
            } else {
                this._registerCountersWithCountersToIncludeObj(resultCounters, idsOrCountersToInclude);
            }
        }

    private _registerCountersWithIdsList(
        resultCounters: object,
        ids: string[],
        countersToInclude: string[],
        gotAll: boolean): void {
        if (this.noTracking) {
            return;
        }

        if (!resultCounters || Object.keys(resultCounters).length === 0) {
            if (gotAll) {
                for (const id of ids) {
                    this._setGotAllCountersForDocument(id);
                }
                return;
            }
        } else {
            this._registerCountersInternal(resultCounters, null, false, gotAll);
        }

        this._registerMissingCounters(ids, countersToInclude);
    }

    private _registerCountersWithCountersToIncludeObj(
        resultCounters: object,
        countersToInclude: { [key: string]: string[] }): void {

        if (this.noTracking) {
            return;
        }

        if (!resultCounters || Object.keys(resultCounters).length === 0) {
            this._setGotAllInCacheIfNeeded(countersToInclude);
        } else {
            this._registerCountersInternal(resultCounters, countersToInclude, true, false);
        }

        this._registerMissingCounters(countersToInclude);
    }
     private _registerCountersInternal(
         resultCounters: object,
         countersToInclude: { [key: string]: string[] },
         fromQueryResult: boolean,
         gotAll: boolean): void {
         for (const [field, value] of Object.entries(resultCounters)) {
             if (!value) {
                 continue;
             }
             let counters = [] as string[];

             if (fromQueryResult) {
                 counters = countersToInclude[field];
                 gotAll = counters && counters.length === 0;
             }

             if (value.length === 0 && !gotAll) {
                 const cache = this.countersByDocId.get(field);
                 if (!cache) {
                     continue;
                 }

                 for (const counter of counters) {
                     cache.data.delete(counter);
                 }

                 this._countersByDocId.set(field, cache);
                 continue;
             }

             this._registerCountersForDocument(field, gotAll, value, countersToInclude);
         }
    }

    private _registerCountersForDocument(id: string, gotAll: boolean, counters: any[], countersToInclude: { [key:string]: string[] } ): void {
        let cache = this.countersByDocId.get(id);
        if (!cache) {
            cache = { gotAll, data: CaseInsensitiveKeysMap.create<number>() };
        }

        const deletedCounters = cache.data.size === 0
            ? new Set<string>()
            : (countersToInclude[id].length === 0 ? new Set(cache.data.keys()) : new Set(countersToInclude[id]));

        for (const counterJson of counters) {
            if (!counterJson) {
                continue;
            }
            const counterName = counterJson["counterName"] as string;
            const totalValue = counterJson["totalValue"] as number;
            if (counterName && totalValue) {
                cache.data.set(counterName, totalValue);
                deletedCounters.delete(counterName);
            }
        }

        if (deletedCounters.size > 0) {
            for (const name of deletedCounters) {
                cache.data.delete(name);
            }
        }

        cache.gotAll = gotAll;
        this._countersByDocId.set(id, cache);
    }

    private _setGotAllInCacheIfNeeded(countersToInclude: { [key: string]: string[] }): void {
        for (const [key, value] of Object.entries(countersToInclude)) {
            if (value.length > 0) {
                continue;
            }

            this._setGotAllCountersForDocument(key);
        }
    }

    private _setGotAllCountersForDocument(id: string): void {
        let cache = this.countersByDocId.get(id);
        if (!cache) {
            cache = { gotAll: false, data: CaseInsensitiveKeysMap.create<number>() };
        }

        cache.gotAll = true;
        this._countersByDocId.set(id, cache);
    }

    private _registerMissingCounters(ids: string[], countersToInclude: string[]): void;
    private _registerMissingCounters(countersToInclude: { [key: string]: string[] }): void;
    private _registerMissingCounters(
        idsOrCountersToInclude: string[] | { [key: string]: string[] }, countersToInclude?: string[]): void {
        if (Array.isArray(idsOrCountersToInclude)) {
            this._registerMissingCountersWithIdsList(idsOrCountersToInclude, countersToInclude);
        } else {
            this._registerMissingCountersWithCountersToIncludeObj(idsOrCountersToInclude);
        }
    }

    public registerTimeSeries(resultTimeSeries: Record<string, Record<string, ServerResponse<TimeSeriesRangeResult>[]>>) {
        if (this.noTracking || !resultTimeSeries) {
            return;
        }

        for (const [id, perDocTs] of Object.entries(resultTimeSeries)) {
            if (!perDocTs) {
                continue;
            }

            let cache = this.timeSeriesByDocId.get(id);
            if (!cache) {
                cache = CaseInsensitiveKeysMap.create();
                this.timeSeriesByDocId.set(id, cache);
            }

            if (!TypeUtil.isObject(perDocTs)) {
                throwError("InvalidOperationException", "Unable to read time series range results on document: '" + id + "'.");
            }

            for (const [name, perNameTs] of Object.entries(perDocTs)) {
                if (!perNameTs) {
                    continue;
                }

                if (!TypeUtil.isArray(perNameTs)) {
                    throwError("InvalidOperationException", "Unable to read time series range results on document: '" + id + "', time series: '" + name + "'.");
                }

                for (const range of perNameTs) {
                    const newRange = InMemoryDocumentSessionOperations._parseTimeSeriesRangeResult(range, id, name, this.conventions);
                    InMemoryDocumentSessionOperations._addToCache(cache, newRange, name);
                }
            }
        }
    }

    private static _addToCache(cache: Map<string, TimeSeriesRangeResult[]>, newRange: TimeSeriesRangeResult, name: string) {
        const localRanges = cache.get(name);
        if (!localRanges || !localRanges.length) {
            // no local ranges in cache for this series
             cache.set(name, [newRange]);
             return;
        }

        if (DatesComparator.compare(leftDate(localRanges[0].from), rightDate(newRange.to)) > 0
            || DatesComparator.compare(rightDate(localRanges[localRanges.length - 1].to), leftDate(newRange.from)) < 0) {
            // the entire range [from, to] is out of cache bounds

            const index = DatesComparator.compare(leftDate(localRanges[0].from), rightDate(newRange.to)) > 0 ? 0 : localRanges.length;
            localRanges.splice(index, 0, newRange);
            return;
        }

        let toRangeIndex;
        let fromRangeIndex = -1;
        let rangeAlreadyInCache = false;

        for (toRangeIndex = 0; toRangeIndex < localRanges.length; toRangeIndex++) {
            if (DatesComparator.compare(leftDate(localRanges[toRangeIndex].from), leftDate(newRange.from)) <= 0) {
                if (DatesComparator.compare(rightDate(localRanges[toRangeIndex].to), rightDate(newRange.to)) >= 0) {
                    rangeAlreadyInCache = true;
                    break;
                }

                fromRangeIndex = toRangeIndex;
                continue;
            }

            if (DatesComparator.compare(rightDate(localRanges[toRangeIndex].to), rightDate(newRange.to)) >= 0) {
                break;
            }
        }

        if (rangeAlreadyInCache) {
            InMemoryDocumentSessionOperations._updateExistingRange(localRanges[toRangeIndex], newRange);
            return;
        }

        const mergedValues = InMemoryDocumentSessionOperations._mergeRanges(fromRangeIndex, toRangeIndex, localRanges, newRange);
        InMemoryDocumentSessionOperations.addToCache(name, newRange.from, newRange.to, fromRangeIndex, toRangeIndex, localRanges, cache, mergedValues);
    }

    public static addToCache(timeseries: string,
                             from: Date,
                             to: Date,
                             fromRangeIndex: number,
                             toRangeIndex: number,
                             ranges: TimeSeriesRangeResult[],
                             cache: Map<string, TimeSeriesRangeResult[]>,
                             values: TimeSeriesEntry[]) {
        if (fromRangeIndex === -1) {
            // didn't find a 'fromRange' => all ranges in cache start after 'from'

            if (toRangeIndex === ranges.length) {
                // the requested range [from, to] contains all the ranges that are in cache

                // e.g. if cache is : [[2,3], [4,5], [7, 10]]
                // and the requested range is : [1, 15]
                // after this action cache will be : [[1, 15]]

                const timeSeriesRangeResult = new TimeSeriesRangeResult();
                timeSeriesRangeResult.from = from;
                timeSeriesRangeResult.to = to;
                timeSeriesRangeResult.entries = values;

                const result: TimeSeriesRangeResult[] = [];
                result.push(timeSeriesRangeResult);
                cache.set(timeseries, result);

                return;
            }

            if (DatesComparator.compare(leftDate(ranges[toRangeIndex].from), rightDate(to)) > 0) {
                // requested range ends before 'toRange' starts
                // remove all ranges that come before 'toRange' from cache
                // add the new range at the beginning of the list

                // e.g. if cache is : [[2,3], [4,5], [7,10]]
                // and the requested range is : [1,6]
                // after this action cache will be : [[1,6], [7,10]]

                ranges.splice(0, toRangeIndex);

                const timeSeriesRangeResult = new TimeSeriesRangeResult();
                timeSeriesRangeResult.from = from;
                timeSeriesRangeResult.to = to;
                timeSeriesRangeResult.entries = values;

                ranges.splice(0, 0, timeSeriesRangeResult);

                return;
            }

            // the requested range ends inside 'toRange'
            // merge the result from server into 'toRange'
            // remove all ranges that come before 'toRange' from cache

            // e.g. if cache is : [[2,3], [4,5], [7,10]]
            // and the requested range is : [1,8]
            // after this action cache will be : [[1,10]]

            ranges[toRangeIndex].from = from;
            ranges[toRangeIndex].entries = values;

            ranges.splice(0, toRangeIndex);

            return;
        }

        // found a 'fromRange'

        if (toRangeIndex === ranges.length) {
            // didn't find a 'toRange' => all the ranges in cache end before 'to'

            if (DatesComparator.compare(rightDate(ranges[fromRangeIndex].to), leftDate(from)) < 0) {
                // requested range starts after 'fromRange' ends,
                // so it needs to be placed right after it
                // remove all the ranges that come after 'fromRange' from cache
                // add the merged values as a new range at the end of the list

                // e.g. if cache is : [[2,3], [5,6], [7,10]]
                // and the requested range is : [4,12]
                // then 'fromRange' is : [2,3]
                // after this action cache will be : [[2,3], [4,12]]

                ranges.splice(fromRangeIndex + 1, ranges.length - fromRangeIndex - 1);

                const timeSeriesRangeResult = new TimeSeriesRangeResult();
                timeSeriesRangeResult.from = from;
                timeSeriesRangeResult.to = to;
                timeSeriesRangeResult.entries = values;

                ranges.push(timeSeriesRangeResult);

                return;
            }

            // the requested range starts inside 'fromRange'
            // merge result into 'fromRange'
            // remove all the ranges from cache that come after 'fromRange'

            // e.g. if cache is : [[2,3], [4,6], [7,10]]
            // and the requested range is : [5,12]
            // then 'fromRange' is [4,6]
            // after this action cache will be : [[2,3], [4,12]]

            ranges[fromRangeIndex].to = to;
            ranges[fromRangeIndex].entries = values;
            ranges.splice(fromRangeIndex + 1, ranges.length - fromRangeIndex - 1);

            return;
        }

        // found both 'fromRange' and 'toRange'
        // the requested range is inside cache bounds

        if (DatesComparator.compare(rightDate(ranges[fromRangeIndex].to), leftDate(from)) < 0) {
            // requested range starts after 'fromRange' ends

            if (DatesComparator.compare(leftDate(ranges[toRangeIndex].from), rightDate(to)) > 0) {
                // requested range ends before 'toRange' starts

                // remove all ranges in between 'fromRange' and 'toRange'
                // place new range in between 'fromRange' and 'toRange'

                // e.g. if cache is : [[2,3], [5,6], [7,8], [10,12]]
                // and the requested range is : [4,9]
                // then 'fromRange' is [2,3] and 'toRange' is [10,12]
                // after this action cache will be : [[2,3], [4,9], [10,12]]

                ranges.splice(fromRangeIndex + 1, toRangeIndex - fromRangeIndex - 1);

                const timeSeriesRangeResult = new TimeSeriesRangeResult();
                timeSeriesRangeResult.from = from;
                timeSeriesRangeResult.to = to;
                timeSeriesRangeResult.entries = values;

                ranges.splice(fromRangeIndex + 1, 0, timeSeriesRangeResult);

                return;
            }

            // requested range ends inside 'toRange'
            // merge the new range into 'toRange'
            // remove all ranges in between 'fromRange' and 'toRange'

            // e.g. if cache is : [[2,3], [5,6], [7,10]]
            // and the requested range is : [4,9]
            // then 'fromRange' is [2,3] and 'toRange' is [7,10]
            // after this action cache will be : [[2,3], [4,10]]

            ranges.splice(fromRangeIndex + 1, toRangeIndex - fromRangeIndex - 1);
            ranges[toRangeIndex].from = from;
            ranges[toRangeIndex].entries = values;

            return;
        }

        // the requested range starts inside 'fromRange'

        if (DatesComparator.compare(leftDate(ranges[toRangeIndex].from), rightDate(to)) > 0) {
            // requested range ends before 'toRange' starts

            // remove all ranges in between 'fromRange' and 'toRange'
            // merge new range into 'fromRange'

            // e.g. if cache is : [[2,4], [5,6], [8,10]]
            // and the requested range is : [3,7]
            // then 'fromRange' is [2,4] and 'toRange' is [8,10]
            // after this action cache will be : [[2,7], [8,10]]

            ranges[fromRangeIndex].to = to;
            ranges[fromRangeIndex].entries = values;
            ranges.splice(fromRangeIndex + 1, toRangeIndex - fromRangeIndex - 1);

            return;
        }

        // the requested range starts inside 'fromRange'
        // and ends inside 'toRange'

        // merge all ranges in between 'fromRange' and 'toRange'
        // into a single range [fromRange.From, toRange.To]

        // e.g. if cache is : [[2,4], [5,6], [8,10]]
        // and the requested range is : [3,9]
        // then 'fromRange' is [2,4] and 'toRange' is [8,10]
        // after this action cache will be : [[2,10]]

        ranges[fromRangeIndex].to = ranges[toRangeIndex].to;
        ranges[fromRangeIndex].entries = values;
        ranges.splice(fromRangeIndex + 1, toRangeIndex - fromRangeIndex);
    }

    private static _parseTimeSeriesRangeResult(json: ServerResponse<TimeSeriesRangeResult>,
                                               id: string,
                                               databaseName: string,
                                               conventions: DocumentConventions): TimeSeriesRangeResult {
        return reviveTimeSeriesRangeResult(json, conventions);
    }

    private static _mergeRanges(fromRangeIndex: number,
                                toRangeIndex: number,
                                localRanges: TimeSeriesRangeResult[],
                                newRange: TimeSeriesRangeResult) {
        const mergedValues: TimeSeriesEntry[] = [];

        if (fromRangeIndex !== -1 && localRanges[fromRangeIndex].to.getTime() >= newRange.from.getTime()) {
            for (const val of localRanges[fromRangeIndex].entries) {
                if (val.timestamp.getTime() >= newRange.from.getTime()) {
                    break;
                }

                mergedValues.push(val);
            }
        }

        mergedValues.push(...newRange.entries);

        if (toRangeIndex < localRanges.length
            && DatesComparator.compare(leftDate(localRanges[toRangeIndex].from), rightDate(newRange.to)) <= 0) {
            for (const val of localRanges[toRangeIndex].entries) {
                if (val.timestamp.getTime() <= newRange.to.getTime()) {
                    continue;
                }

                mergedValues.push(val);
            }
        }

        return mergedValues;
    }

    private static _updateExistingRange(localRange: TimeSeriesRangeResult, newRange: TimeSeriesRangeResult) {
        const newValues: TimeSeriesEntry[] = [];

        let index: number;

        for (index = 0; index < localRange.entries.length; index++) {
            if (localRange.entries[index].timestamp.getTime() >= newRange.from.getTime()) {
                break;
            }

            newValues.push(localRange.entries[index]);
        }

        newValues.push(...newRange.entries);

        localRange.entries.forEach(item => {
            if (item.timestamp.getTime() <= newRange.to.getTime()) {
                return;
            }

            newValues.push(item);
        });

        localRange.entries = newValues;
    }

    private _registerMissingCountersWithCountersToIncludeObj(countersToInclude: { [key: string]: string[] }): void {
        if (!countersToInclude) {
            return;
        }

        for (const [key, value] of Object.entries(countersToInclude)) {
            let cache = this.countersByDocId.get(key);
            if (!cache) {
                cache = { gotAll: false, data: CaseInsensitiveKeysMap.create<number>() };
                this.countersByDocId.set(key, cache);
            }

            for (const counter of value) {
                if (cache.data.has(counter)) {
                    continue;
                }

                cache.data.set(counter, null);
            }
        }
    }

    private _registerMissingCountersWithIdsList(ids: string[], countersToInclude: string[]): void {
        if (!countersToInclude) {
            return;
        }

        for (const counter of countersToInclude) {
            for (const id of ids) {
                let cache = this.countersByDocId.get(id);
                if (!cache) {
                    cache = { gotAll: false, data: CaseInsensitiveKeysMap.create<number>() };
                    this.countersByDocId.set(id, cache);
                }

                if (cache.data.has(counter)) {
                    continue;
                }

                cache.data.set(counter, null);
            }
        }
    }

    public store<TEntity extends object>(
        entity: TEntity): Promise<void>;
    public store<TEntity extends object>(
        entity: TEntity,
        id?: string): Promise<void>;
    public store<TEntity extends object>(
        entity: TEntity,
        id?: string,
        documentType?: DocumentType<TEntity>): Promise<void>;
    public store<TEntity extends object>(
        entity: TEntity,
        id?: string,
        options?: StoreOptions<TEntity>): Promise<void>;
    public store<TEntity extends object>(
        entity: TEntity,
        id?: string,
        docTypeOrOptions?: DocumentType<TEntity> | StoreOptions<TEntity>): Promise<void> {

        let documentType: DocumentType<TEntity> = null;
        let options: StoreOptions<TEntity> = {};

        // figure out third arg
        if (TypeUtil.isDocumentType<TEntity>(docTypeOrOptions)) {
            documentType = docTypeOrOptions as DocumentType<TEntity>;
        } else if (TypeUtil.isObject(docTypeOrOptions)) {
            options = docTypeOrOptions as StoreOptions<TEntity>;
        }

        const changeVector = options.changeVector;
        documentType = documentType || options.documentType;
        this.conventions.tryRegisterJsType(documentType);
        if (entity.constructor !== Object) {
            this.conventions.tryRegisterJsType(entity.constructor as ClassConstructor);
        }

        let forceConcurrencyCheck: ConcurrencyCheckMode;
        if (!TypeUtil.isUndefined(changeVector)) {
            forceConcurrencyCheck = changeVector === null ? "Disabled" : "Forced";
        } else if (!TypeUtil.isNullOrUndefined(id)) {
            forceConcurrencyCheck = "Auto";
        } else {
            const hasId = this._generateEntityIdOnTheClient.tryGetIdFromInstance(entity);
            forceConcurrencyCheck = !hasId ? "Forced" : "Auto";
        }

        return this._storeInternal(entity, changeVector, id, forceConcurrencyCheck, documentType);
    }

    protected _generateDocumentKeysOnStore: boolean = true;

    private async _storeInternal(
        entity: object,
        changeVector: string,
        id: string,
        forceConcurrencyCheck: ConcurrencyCheckMode,
        documentType: DocumentType): Promise<void> {
        if (this.noTracking) {
            throwError(
                "InvalidOperationException",
                "Cannot store entity. Entity tracking is disabled in this session.");
        }

        if (!entity) {
            throwError("InvalidArgumentException", "Entity cannot be null or undefined.");
        }

        const value = this.documentsByEntity.get(entity);
        if (value) {
            if (id && !StringUtil.equalsIgnoreCase(value.id, id)) {
                throwError("InvalidOperationException", "Cannot store the same entity (id: " + value.id + ") with different id (" + id + ")");
            }
            value.changeVector = changeVector || value.changeVector;
            value.concurrencyCheckMode = forceConcurrencyCheck;
            return;
        }

        if (!id) {
            if (this._generateDocumentKeysOnStore) {
                id = await this._generateEntityIdOnTheClient.generateDocumentKeyForStorage(entity);
            } else {
                this._rememberEntityForDocumentIdGeneration(entity);
            }
        } else {
            this.generateEntityIdOnTheClient.trySetIdentity(entity, id);
        }

        const cmdKey = IdTypeAndName.keyFor(id, "ClientAnyCommand", null);
        if (this.deferredCommandsMap.has(cmdKey)) {
            throwError("InvalidOperationException",
                "Can't store document, there is a deferred command registered "
                + "for this document in the session. Document id: " + id);
        }

        if (this.deletedEntities.contains(entity)) {
            throwError("InvalidOperationException",
                "Can't store object, it was already deleted in this session. Document id: " + id);
        }

        // we make the check here even if we just generated the ID
        // users can override the ID generation behavior, and we need
        // to detect if they generate duplicates.
        this._assertNoNonUniqueInstance(entity, id);

        const conventions = this._requestExecutor.conventions;

        const typeDesc = conventions.getJsTypeByDocumentType(documentType);
        const collectionName: string = documentType
            ? conventions.getCollectionNameForType(typeDesc)
            : conventions.getCollectionNameForEntity(entity);

        const metadata = {};
        if (collectionName) {
            metadata[CONSTANTS.Documents.Metadata.COLLECTION] = collectionName;
        }

        const entityType = documentType
                ? conventions.getJsTypeByDocumentType(documentType)
                : conventions.getTypeDescriptorByEntity(entity);
        const jsType = conventions.getJsTypeName(entityType);
        if (jsType) {
            metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = jsType;
        }

        if (id) {
            this._knownMissingIds.delete(id);
        }

        this._storeEntityInUnitOfWork(id, entity, changeVector, metadata, forceConcurrencyCheck, documentType);
    }

    protected _storeEntityInUnitOfWork(
        id: string,
        entity: object,
        changeVector: string,
        metadata: object,
        forceConcurrencyCheck: ConcurrencyCheckMode,
        documentType: DocumentType): void {

        if (id) {
            this._knownMissingIds.delete(id);
        }

        if (this.transactionMode === "ClusterWide") {
            if (!changeVector) {
                let changeVectorInner: string;
                if (this.clusterSession.tryGetMissingAtomicGuardFor(id, r => changeVectorInner = r)) {
                    changeVector = changeVectorInner;
                }
            }
        }

        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.metadata = metadata;
        documentInfo.changeVector = changeVector;
        documentInfo.concurrencyCheckMode = forceConcurrencyCheck;
        documentInfo.entity = entity;
        documentInfo.newDocument = true;
        documentInfo.document = null;

        this.documentsByEntity.put(entity, documentInfo);

        if (id) {
            this.documentsById.add(documentInfo);
        }
    }

    protected _rememberEntityForDocumentIdGeneration(entity: object): void {
        throwError("NotImplementedException",
            "You cannot set GenerateDocumentIdsOnStore to false"
            + " without implementing RememberEntityForDocumentIdGeneration");
    }

    public prepareForSaveChanges(): SaveChangesData {
        const result = this._newSaveChangesData();

        const deferredCommandsCount = this._deferredCommands.length;

        this._prepareForEntitiesDeletion(result, null);
        this._prepareForEntitiesPuts(result);

        this._prepareForCreatingRevisionsFromIds(result);
        this._prepareCompareExchangeEntities(result);

        if (this._deferredCommands.length > deferredCommandsCount) {
            // this allow OnBeforeStore to call Defer during the call to include
            // additional values during the same SaveChanges call

            for (let i = deferredCommandsCount; i < this._deferredCommands.length; i++) {
                result.deferredCommands.push(this._deferredCommands[i]);
            }

            for (const item of this.deferredCommandsMap.entries()) {
                result.deferredCommandsMap.set(item[0], item[1]);
            }
        }

        for (const deferredCommand of result.deferredCommands) {
            if (deferredCommand.onBeforeSaveChanges) {
                deferredCommand.onBeforeSaveChanges(this);
            }
        }

        return result;
    }

    public validateClusterTransaction(result: SaveChangesData): void {
        if (this._transactionMode !== "ClusterWide") {
            return;
        }

        if (this.useOptimisticConcurrency) {
            throwError(
                "InvalidOperationException",
                "useOptimisticConcurrency is not supported with TransactionMode set to "
                    + "ClusterWide" as TransactionMode);
        }

        for (const commandData of result.sessionCommands) {
            switch (commandData.type) {
                case "PUT":
                case "DELETE":
                    if (commandData.changeVector) {
                        throwError(
                            "InvalidOperationException",
                            "Optimistic concurrency for "
                            + commandData.id + " is not supported when using a cluster transaction.");
                    }
                    break;
                case "CompareExchangeDELETE":
                case "CompareExchangePUT":
                    break;
                default:
                    throwError(
                        "InvalidOperationException",
                        "The command '" + commandData.type + "' is not supported in a cluster session.");
            }
        }
    }

    protected _updateSessionAfterSaveChanges(result: BatchCommandResult): void {
        const returnedTransactionIndex = result.transactionIndex;
        this._documentStore.setLastTransactionIndex(this.databaseName, returnedTransactionIndex);
        this.sessionInfo.lastClusterTransactionIndex = returnedTransactionIndex;
    }

    public onBeforeConversionToDocumentInvoke(id: string, entity: object) {
        const args = new BeforeConversionToDocumentEventArgs(this, id, entity);
        this.emit("beforeConversionToDocument", args);
    }

    public onAfterConversionToDocumentInvoke(id: string, entity: object, document: Reference<object>) {
        if (this.listenerCount("afterConversionToDocument")) {
            const eventArgs = new AfterConversionToDocumentEventArgs(this, id, entity, document);
            this.emit("afterConversionToDocument", eventArgs);

            if (eventArgs.document.value && eventArgs.document.value !== document.value) {
                document.value = eventArgs.document.value; //TODO: test if doc ref changes
            }
        }
    }

    public onBeforeConversionToEntityInvoke(id: string, type: DocumentType, document: Reference<object>) {
        if (this.listenerCount("beforeConversionToEntity")) {
            const eventArgs = new BeforeConversionToEntityEventArgs(this, id, type, document.value);
            this.emit("beforeConversionToEntity", eventArgs);

            if (eventArgs.document && eventArgs.document !== document) {
                document.value = eventArgs.document;
            }
        }
    }

    public onAfterConversionToEntityInvoke(id: string, document: object, entity: object) {
        const eventArgs = new AfterConversionToEntityEventArgs(this, id, document, entity);
        this.emit("afterConversionToEntity", eventArgs);
    }

    private _prepareCompareExchangeEntities(result: SaveChangesData): void {
        if (!this._hasClusterSession()) {
            return;
        }

        const clusterTransactionOperations = this.clusterSession;
        if (!clusterTransactionOperations.numberOfTrackedCompareExchangeValues) {
            return;
        }

        if (this._transactionMode !== "ClusterWide") {
            throwError(
                "InvalidOperationException",
                "Performing cluster transaction operation require the TransactionMode to be set to ClusterWide");
        }

        this.clusterSession.prepareCompareExchangeEntities(result);
    }

    protected abstract _hasClusterSession(): boolean;

    protected abstract _clearClusterSession(): void;

    public abstract clusterSession: ClusterTransactionOperationsBase;

    private _newSaveChangesData(): SaveChangesData {
        return new SaveChangesData({
            deferredCommands: [...this._deferredCommands],
            deferredCommandsMap: new Map(this.deferredCommandsMap),
            options: this._saveChangesOptions,
            session: this
        });
    }

    private _prepareForCreatingRevisionsFromIds(result: SaveChangesData) {
        // Note: here there is no point checking 'Before' or 'After' because if there were changes then forced revision is done from the PUT command....

        for (const idEntry of this.idsForCreatingForcedRevisions.keys()) {
            result.sessionCommands.push(new ForceRevisionCommandData(idEntry));
        }

        this.idsForCreatingForcedRevisions.clear();
    }

    private _prepareForEntitiesDeletion(result: SaveChangesData, changes: { [id: string]: DocumentsChanges[] }): void {
        const deletes = this.deletedEntities.prepareEntitiesDeletes();
        try {
            for (const deletedEntity of this.deletedEntities) {
                let documentInfo = this.documentsByEntity.get(deletedEntity.entity);
                if (!documentInfo) {
                    continue;
                }

                if (changes) {
                    const docChanges = [];
                    const change = new DocumentsChanges();
                    change.fieldNewValue = "";
                    change.fieldOldValue = "";
                    change.change = "DocumentDeleted";

                    docChanges.push(change);
                    changes[documentInfo.id] = docChanges;
                } else {
                    const command: ICommandData =
                        result.deferredCommandsMap.get(IdTypeAndName.keyFor(documentInfo.id, "ClientAnyCommand", null));
                    if (command) {
                        InMemoryDocumentSessionOperations._throwInvalidDeletedDocumentWithDeferredCommand(command);
                    }

                    let changeVector = null;
                    documentInfo = this.documentsById.getValue(documentInfo.id);

                    if (documentInfo) {
                        changeVector = documentInfo.changeVector;

                        if (documentInfo.entity) {
                            result.onSuccess.removeDocumentByEntity(documentInfo.entity);
                            result.entities.push(documentInfo.entity);
                        }

                        result.onSuccess.removeDocumentById(documentInfo.id);
                    }

                    if (!this.useOptimisticConcurrency) {
                        changeVector = null;
                    }
                    const beforeDeleteEventArgs =
                        new SessionBeforeDeleteEventArgs(this, documentInfo.id, documentInfo.entity);
                    this.emit("beforeDelete", beforeDeleteEventArgs);
                    result.sessionCommands.push(new DeleteCommandData(documentInfo.id, changeVector, documentInfo.changeVector));
                }

                if (!changes) {
                    result.onSuccess.clearDeletedEntities();
                }
            }
        } finally {
            deletes.dispose();
        }
    }

    private _prepareForEntitiesPuts(result: SaveChangesData): void {
        const putsContext = this.documentsByEntity.prepareEntitiesPuts();
        try {
            const shouldIgnoreEntityChanges = this.conventions.shouldIgnoreEntityChanges;

            for (const entry of this.documentsByEntity) {
                const  { key: entityKey, value: entityValue } = entry;

                if (entityValue.ignoreChanges) {
                    continue;
                }

                if (shouldIgnoreEntityChanges) {
                    if (shouldIgnoreEntityChanges(this, entry.value.entity, entry.value.id)) {
                        continue;
                    }
                }

                if (this.isDeleted(entityValue.id)) {
                    continue;
                }

                const dirtyMetadata = InMemoryDocumentSessionOperations._updateMetadataModifications(entityValue);

                let document = this.entityToJson.convertEntityToJson(entityKey, entityValue);
                if (!this._entityChanged(document, entityValue, null) && !dirtyMetadata) {
                    continue;
                }

                const command = result.deferredCommandsMap.get(
                    IdTypeAndName.keyFor(entityValue.id, "ClientModifyDocumentCommand", null));
                if (command) {
                    InMemoryDocumentSessionOperations._throwInvalidModifiedDocumentWithDeferredCommand(command);
                }

                const beforeStoreEventArgs = new SessionBeforeStoreEventArgs(this, entityValue.id, entityKey);

                if (this.emit("beforeStore", beforeStoreEventArgs)) { //TODO: && entity.executeOnBeforeStore
                    if (beforeStoreEventArgs.isMetadataAccessed()) {
                        InMemoryDocumentSessionOperations._updateMetadataModifications(entityValue);
                    }

                    if (beforeStoreEventArgs.isMetadataAccessed() || this._entityChanged(document, entityValue, null)) {
                        document = this.entityToJson.convertEntityToJson(entityKey, entityValue);
                    }
                }

                result.entities.push(entityKey);

                if (entityValue.id) {
                    result.onSuccess.removeDocumentById(entityValue.id);
                }
                result.onSuccess.updateEntityDocumentInfo(entityValue, document);

                let changeVector: string;
                if (this.useOptimisticConcurrency) {
                    if (entityValue.concurrencyCheckMode !== "Disabled") {
                        // if the user didn't provide a change vector, we'll test for an empty one
                        changeVector = entityValue.changeVector || "";
                    } else {
                        changeVector = null;
                    }
                } else if (entityValue.concurrencyCheckMode === "Forced") {
                    changeVector = entityValue.changeVector;
                } else {
                    changeVector = null;
                }

                let forceRevisionCreationStrategy: ForceRevisionStrategy = "None";

                if (entityValue.id) {
                    // Check if user wants to Force a Revision
                    const creationStrategy = this.idsForCreatingForcedRevisions.get(entityValue.id);
                    if (creationStrategy) {
                        this.idsForCreatingForcedRevisions.delete(entityValue.id);
                        forceRevisionCreationStrategy = creationStrategy;
                    }
                }

                result.sessionCommands.push(
                    new PutCommandDataWithJson(entityValue.id,
                        changeVector,
                        entityValue.changeVector,
                        document,
                        forceRevisionCreationStrategy));
            }
        } finally {
            putsContext.dispose();
        }
    }

    protected _entityChanged(
        newObj: object,
        documentInfo: DocumentInfo,
        changes: { [id: string]: DocumentsChanges[] }): boolean {
        return JsonOperation.entityChanged(newObj, documentInfo, changes);
    }

    private static _throwInvalidModifiedDocumentWithDeferredCommand(resultCommand: ICommandData): void {
        throwError("InvalidOperationException", "Cannot perform save because document " + resultCommand.id
            + " has been modified by the session and is also taking part in deferred "
            + resultCommand.type + " command");
    }

    private static _throwInvalidDeletedDocumentWithDeferredCommand(resultCommand: ICommandData): void {
        throwError("InvalidOperationException", "Cannot perform save because document " + resultCommand.id
            + " has been deleted by the session and is also taking part in deferred "
            + resultCommand.type + " command");
    }

    private static _updateMetadataModifications(documentInfo: DocumentInfo) {
        let dirty = false;

        if (documentInfo.metadataInstance) {
            if (documentInfo.metadataInstance.isDirty()) {
                dirty = true;
            }

            for (const prop of Object.keys(documentInfo.metadataInstance)) {
                const propValue = documentInfo.metadataInstance[prop];
                if (propValue && (typeof propValue["isDirty"] === "function"
                        && (propValue as IMetadataDictionary).isDirty())) {
                    dirty = true;
                }

                documentInfo.metadata[prop] = ObjectUtil.deepJsonClone(propValue);
            }
        }

        return dirty;
    }

    public async delete(id: string): Promise<void>;
    public async delete(id: string, expectedChangeVector: string): Promise<void>;
    public async delete<TEntity extends IRavenObject>(entity: TEntity): Promise<void>;
    public async delete<TEntity extends IRavenObject>(
        idOrEntity: string | TEntity, expectedChangeVector: string = null): Promise<void> {
        if (TypeUtil.isString(idOrEntity)) {
            this._deleteById(idOrEntity as string, expectedChangeVector);
            return;
        }

        this._deleteByEntity(idOrEntity as TEntity);
    }

    /**
     * Marks the specified entity for deletion. The entity will be deleted when SaveChanges is called.
     */
    private _deleteByEntity<TEntity extends IRavenObject>(entity: TEntity) {
        if (!entity) {
            throwError("InvalidArgumentException", "Entity cannot be null.");
        }

        const value = this.documentsByEntity.get(entity);
        if (!value) {
            throwError("InvalidOperationException",
                entity + " is not associated with the session, cannot delete unknown entity instance");
        }

        this.deletedEntities.add(entity);
        this.includedDocumentsById.delete(value.id);

        if (this._countersByDocId) {
            this._countersByDocId.delete(value.id);
        }

        if (this._timeSeriesByDocId) {
            this._timeSeriesByDocId.delete(value.id);
        }

        this._knownMissingIds.add(value.id);
    }

    /**
     * Marks the specified entity for deletion. The entity will be deleted when IDocumentSession.SaveChanges is called.
     * WARNING: This method will not call beforeDelete listener!
     */
    private _deleteById(id: string): void;
    private _deleteById(id: string, expectedChangeVector: string): void;
    private _deleteById(id: string, expectedChangeVector: string = null): void {
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null.");
        }

        let changeVector = null;
        const documentInfo = this.documentsById.getValue(id);
        if (documentInfo) {
            const newObj = this.entityToJson.convertEntityToJson(documentInfo.entity, documentInfo);
            if (documentInfo.entity && this._entityChanged(newObj, documentInfo, null)) {
                throwError("InvalidOperationException",
                    "Can't delete changed entity using identifier. Use delete(T entity) instead.");
            }

            if (documentInfo.entity) {
                this.documentsByEntity.remove(documentInfo.entity);
            }

            this.documentsById.remove(id);
            changeVector = documentInfo.changeVector;
        }

        this._knownMissingIds.add(id);
        changeVector = this.useOptimisticConcurrency ? changeVector : null;

        if (this._countersByDocId) {
            this._countersByDocId.delete(id);
        }

        this.defer(new DeleteCommandData(
            id,
            expectedChangeVector || changeVector,
            expectedChangeVector || documentInfo?.changeVector
        ));
    }

    /**
     * Defer commands to be executed on saveChanges()
     */
    public defer(...commands: ICommandData[]) {
        this._deferredCommands.push(...commands);
        for (const command of commands) {
            this._deferInternal(command);
        }
    }

    private _deferInternal(command: ICommandData): void {
        if (command.type === "BatchPATCH") {
            const batchPatchCommand = command as BatchPatchCommandData;
            for (const kvp of batchPatchCommand.ids) {
                this._addCommand(command, kvp.id, "PATCH", command.name);
            }

            return;
        }

        this._addCommand(command, command.id, command.type, command.name);
    }

    private _addCommand(command: ICommandData, id: string, commandType: CommandType, commandName: string): void {
        this.deferredCommandsMap.set(
            IdTypeAndName.keyFor(id, commandType, commandName), command);
        this.deferredCommandsMap.set(
            IdTypeAndName.keyFor(id, "ClientAnyCommand", null), command);

        if (command.type !== "AttachmentPUT"
            && command.type !== "AttachmentDELETE"
            && command.type !== "AttachmentCOPY"
            && command.type !== "AttachmentMOVE"
            && command.type !== "Counters"
            && command.type !== "TimeSeries"
            && command.type !== "TimeSeriesWithIncrements"
            && command.type !== "TimeSeriesCopy") {
            this.deferredCommandsMap.set(
                IdTypeAndName.keyFor(id, "ClientModifyDocumentCommand", null), command);
        }
    }

    protected _buildEntityDocInfoByIdHolder<T extends object>(entities: T[]): Map<string, [object, DocumentInfo]> {
        const idsEntitiesPairs = new Map<string, [object, DocumentInfo]>();

        for (const entity of entities) {
            const docInfo = this.documentsByEntity.get(entity);
            if (!docInfo) {
                InMemoryDocumentSessionOperations._throwCouldNotRefreshDocument("Cannot refresh a transient instance.");
            }

            idsEntitiesPairs.set(docInfo.id, [entity, docInfo]);
        }

        return idsEntitiesPairs;
    }

    protected _refreshEntities(command: GetDocumentsCommand, idsEntitiesPairs: Map<string, [object, DocumentInfo]>) {
        const list: EntityInfoAndResult[] = [];

        let hasDeleted = false;
        const resultsCollection = command.result.results;

        for (const result of resultsCollection) {
            if (!result) {
                hasDeleted = true;
                break;
            }

            const id = result[CONSTANTS.Documents.Metadata.KEY][CONSTANTS.Documents.Metadata.ID];
            const tuple = idsEntitiesPairs.get(id);

            if (!tuple) {
                InMemoryDocumentSessionOperations._throwCouldNotRefreshDocument("Could not refresh an entity, the server returned an invalid id: " + id + ". Should not happen!");
            }
            list.push({
                entity: tuple[0],
                info: tuple[1],
                result
            });
        }

        if (hasDeleted) {
            InMemoryDocumentSessionOperations._throwCouldNotRefreshDocument("Some of the requested documents are no longer exists and were probably deleted!");
        }

        for (const tuple of list) {
            this._refreshInternal(tuple.entity, tuple.result, tuple.info);
        }
    }

    protected static _throwCouldNotRefreshDocument(msg: string) {
        throwError("InvalidArgumentException", msg);
    }


    protected _refreshInternal<T extends object>(
        entity: T, cmd: object, documentInfo: DocumentInfo): void {
        const document = cmd;
        if (!document) {
            throwError("InvalidOperationException",
                "Document '" + documentInfo.id + "' no longer exists and was probably deleted");
        }

        const value = document[CONSTANTS.Documents.Metadata.KEY];
        documentInfo.metadata = value;

        if (documentInfo.metadata) {
            const changeVector = value[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
            documentInfo.changeVector = changeVector;
        }

        if (documentInfo.entity && !this.noTracking) {
            this.entityToJson.removeFromMissing(documentInfo.entity);
        }

        const entityType = this.conventions.getTypeDescriptorByEntity(entity);
        documentInfo.entity = this.entityToJson.convertToEntity(entityType, documentInfo.id, document, !this.noTracking);
        documentInfo.document = document;

        Object.assign(entity, documentInfo.entity);

        const documentInfoById = this.documentsById.getValue(documentInfo.id);

        if (documentInfoById) {
            documentInfoById.entity = entity;
        }

        this.onAfterConversionToEntityInvoke(documentInfo.id, documentInfo.document, documentInfo.entity);
    }

    /**
     * Returns all changes for the specified entity. Including name of the field/property that changed, its old and new value and change type.
     * @param entity Entity
     */
    public whatChangedFor(entity: object): DocumentsChanges[] {
        const documentInfo = this.documentsByEntity.get(entity);
        if (!documentInfo) {
            return [];
        }

        if (this.deletedEntities.contains(entity)) {
            const change = new DocumentsChanges();
            change.fieldNewValue = "";
            change.fieldOldValue = "";
            change.change = "DocumentDeleted";

            return [change];
        }

        InMemoryDocumentSessionOperations._updateMetadataModifications(documentInfo);
        const document = this.entityToJson.convertEntityToJson(documentInfo.entity, documentInfo);

        const changes: { [id: string]: DocumentsChanges[] } = {};
        if (!this._entityChanged(document, documentInfo, changes)) {
            return [];
        }

        return changes[documentInfo.id];
    }

    public getTrackedEntities(): Map<string, EntityInfo> {
        const tracked = this.documentsById.getTrackedEntities(this);

        for (const id of this._knownMissingIds) {
            if (tracked.has(id)) {
                continue;
            }

            const entityInfo = new EntityInfo();
            entityInfo.id = id;
            entityInfo.isDeleted = true;

            tracked.set(id, entityInfo);
        }

        return tracked;
    }

    /**
     * Gets a value indicating whether any of the entities tracked by the session has changes.
     */
    public hasChanges(): boolean {
        for (const entity of this.documentsByEntity) {
            const document = this.entityToJson.convertEntityToJson(entity.key, entity.value);
            if (this._entityChanged(document, entity.value, null)) {
                return true;
            }
        }

        return !!this.deletedEntities.size || this.deferredCommands.length > 0;
    }

    /**
     * Evicts the specified entity from the session.
     * Remove the entity from the delete queue and stops tracking changes for this entity.
     */
    public evict<T extends object>(entity: T): void {
        const documentInfo = this.documentsByEntity.get(entity);
        if (documentInfo) {
            this.documentsByEntity.evict(entity);
            this.documentsById.remove(documentInfo.id);
            if (this._countersByDocId) {
                this._countersByDocId.delete(documentInfo.id);
            }
            if (this._timeSeriesByDocId) {
                this._timeSeriesByDocId.delete(documentInfo.id);
            }
        }

        this.deletedEntities.evict(entity);
        this.entityToJson.removeFromMissing(entity);
    }

    /**
     * Clears this instance.
     * Remove all entities from the delete queue and stops tracking changes for all entities.
     */
    public clear(): void {
        this.documentsByEntity.clear();
        this.deletedEntities.clear();
        this.documentsById.clear();
        this._knownMissingIds.clear();
        if (this._countersByDocId) {
            this._countersByDocId.clear();
        }

        this.deferredCommands.length = 0;
        this.deferredCommandsMap.clear();
        this._clearClusterSession();

        this._pendingLazyOperations.length = 0;
        this.entityToJson.clear();
    }

    /**
     * Determines whether the specified entity has changed.
     */
    public hasChanged(entity: object): boolean {
        const documentInfo = this.documentsByEntity.get(entity);

        if (!documentInfo) {
            return false;
        }

        const document = this.entityToJson.convertEntityToJson(entity, documentInfo);
        return this._entityChanged(document, documentInfo, null);
    }

    /**
     * SaveChanges will wait for the changes made to be replicates to `replicas` nodes
     */
    public waitForReplicationAfterSaveChanges();
    /**
     * SaveChanges will wait for the changes made to be replicates to `replicas` nodes
     */
    public waitForReplicationAfterSaveChanges(opts: ReplicationBatchOptions);
    /**
     * SaveChanges will wait for the changes made to be replicates to `replicas` nodes
     */
    public waitForReplicationAfterSaveChanges(opts?: ReplicationBatchOptions) {
        if (!this._saveChangesOptions) {
            this._saveChangesOptions = {
                indexOptions: null,
                replicationOptions: null
            };
        }

        opts = opts || {};

        this._saveChangesOptions.replicationOptions = {
            replicas: opts.replicas || 1,
            throwOnTimeout: TypeUtil.isUndefined(opts.throwOnTimeout) ? true : opts.throwOnTimeout,
            majority: TypeUtil.isNullOrUndefined(opts.majority) ? false : opts.majority,
            timeout: opts.timeout || this.conventions.waitForReplicationAfterSaveChangesTimeout
        } as ReplicationBatchOptions;
    }

    /**
     * SaveChanges will wait for the indexes to catch up with the saved changes
     */
    public waitForIndexesAfterSaveChanges();
    /**
     * SaveChanges will wait for the indexes to catch up with the saved changes
     */
    public waitForIndexesAfterSaveChanges(opts: IndexBatchOptions);
    /**
     * SaveChanges will wait for the indexes to catch up with the saved changes
     */
    public waitForIndexesAfterSaveChanges(opts?: IndexBatchOptions) {
        if (!this._saveChangesOptions) {
            this._saveChangesOptions = {
                indexOptions: null,
                replicationOptions: null
            };
        }

        opts = opts || {};

        this._saveChangesOptions.indexOptions = {
            indexes: opts.indexes || [],
            throwOnTimeout: TypeUtil.isNullOrUndefined(opts.throwOnTimeout) ? true : opts.throwOnTimeout,
            timeout: opts.timeout || this.conventions.waitForIndexesAfterSaveChangesTimeout
        };
    }

    /**
     * Mark the entity as one that should be ignore for change tracking purposes,
     * it still takes part in the session, but is ignored for SaveChanges.
     */
    public ignoreChangesFor(entity: object): void {
        this._getDocumentInfo(entity).ignoreChanges = true;
    }

    public whatChanged(): { [id: string]: DocumentsChanges[] } {
        const changes: { [id: string]: DocumentsChanges[] } = {};

        this._getAllEntitiesChanges(changes);
        this._prepareForEntitiesDeletion(null, changes);

        return changes;
    }

    private _getAllEntitiesChanges(changes: { [id: string]: DocumentsChanges[] }): void {
        for (const pair of this.documentsById.entries()) {
            InMemoryDocumentSessionOperations._updateMetadataModifications(pair[1]);
            const newObj = this.entityToJson.convertEntityToJson(pair[1].entity, pair[1]);
            this._entityChanged(newObj, pair[1], changes);
        }
    }

    public dispose(isDisposing?: boolean): void {
        if (this._disposed) {
            return;
        }

        this.emit("sessionDisposing", { session: this });

        this._disposed = true;
    }

    public get transactionMode() {
        return this._transactionMode;
    }

    public set transactionMode(value) {
        this._transactionMode = value;
    }

    public static validateTimeSeriesName(name: string) {
        if (StringUtil.isNullOrEmpty(name)) {
            throwError("InvalidArgumentException", "Time Series name must contain at least one character");
        }

        if (StringUtil.startsWithIgnoreCase(name, HEADERS.INCREMENTAL_TIME_SERIES_PREFIX) && !name.includes("@")) {
            throwError("InvalidArgumentException", "Time Series name cannot start with " + HEADERS.INCREMENTAL_TIME_SERIES_PREFIX + " prefix");
        }
    }

    public static validateIncrementalTimeSeriesName(name: string) {
        if (StringUtil.isNullOrEmpty(name)) {
            throwError("InvalidArgumentException", "Incremental Time Series name must contain at least one character");
        }

        if (!StringUtil.startsWithIgnoreCase(name, HEADERS.INCREMENTAL_TIME_SERIES_PREFIX)) {
            throwError("InvalidArgumentException", "Time Series name must start with " + HEADERS.INCREMENTAL_TIME_SERIES_PREFIX + " prefix");
        }

        if (name.includes("@")) {
            throwError("InvalidArgumentException", "Time Series from type Rollup cannot be Incremental");
        }
    }

    private static _throwNoDatabase(): never {
        return throwError(
            "InvalidOperationException",
            "Cannot open a Session without specifying a name of a database " +
            "to operate on. Database name can be passed as an argument when Session is" +
                " being opened or default database can be defined using 'DocumentStore.setDatabase()' method");
    }
}

export class DocumentsByEntityHolder implements Iterable<DocumentsByEntityEnumeratorResult> {
    private readonly _documentsByEntity = new Map<object, DocumentInfo>();
    private _onBeforeStoreDocumentsByEntity: Map<object, DocumentInfo>;
    private _prepareEntitiesPuts: boolean;

    public get size(): number {
        return this._documentsByEntity.size + (this._onBeforeStoreDocumentsByEntity ? this._onBeforeStoreDocumentsByEntity.size : 0);
    }

    public remove(entity: object) {
        this._documentsByEntity.delete(entity);

        if (this._onBeforeStoreDocumentsByEntity) {
            this._onBeforeStoreDocumentsByEntity.delete(entity);
        }
    }

    public evict(entity: object) {
        if (this._prepareEntitiesPuts) {
            throwError("InvalidArgumentException", "Cannot Evict entity during OnBeforeStore");
        }

        this._documentsByEntity.delete(entity);
    }

    public put(entity: object, documentInfo: DocumentInfo) {
        if (!this._prepareEntitiesPuts) {
            this._documentsByEntity.set(entity, documentInfo);
            return;
        }

        this._createOnBeforeStoreDocumentsByEntityIfNeeded();
        this._onBeforeStoreDocumentsByEntity.set(entity, documentInfo);
    }

    private _createOnBeforeStoreDocumentsByEntityIfNeeded() {
        if (this._onBeforeStoreDocumentsByEntity) {
            return;
        }

        this._onBeforeStoreDocumentsByEntity = new Map<object, DocumentInfo>();
    }

    public clear() {
        this._documentsByEntity.clear();
        if (this._onBeforeStoreDocumentsByEntity) {
            this._onBeforeStoreDocumentsByEntity.clear();
        }
    }

    public get(entity: object): DocumentInfo {
        const documentInfo = this._documentsByEntity.get(entity);
        if (documentInfo) {
            return documentInfo;
        }

        if (this._onBeforeStoreDocumentsByEntity) {
            return this._onBeforeStoreDocumentsByEntity.get(entity);
        }

        return null;
    }

    [Symbol.iterator](): Iterator<DocumentsByEntityEnumeratorResult> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const generator = function* () {
            const firstIterator = self._documentsByEntity.entries();

            for (const item of firstIterator) {
                const mapped: DocumentsByEntityEnumeratorResult = {
                    key: item[0],
                    value: item[1],
                    executeOnBeforeStore: true
                }
                yield mapped;
            }

            if (!self._onBeforeStoreDocumentsByEntity) {
                return;
            }

            for (const item of self._onBeforeStoreDocumentsByEntity.entries()) {
                const mapped: DocumentsByEntityEnumeratorResult = {
                    key: item[0],
                    value: item[1],
                    executeOnBeforeStore: false
                }
                yield mapped;
            }
        };

        return generator();
    }

    public prepareEntitiesPuts(): IDisposable {
        this._prepareEntitiesPuts = true;

        return {
            dispose(): void {
                this._prepareEntitiesPuts = false;
            }
        }
    }
}

export interface DocumentsByEntityEnumeratorResult {
    key: object;
    value: DocumentInfo;
    executeOnBeforeStore: boolean;
}

export class DeletedEntitiesHolder implements Iterable<DeletedEntitiesEnumeratorResult> {
    private readonly _deletedEntities = new Set<object>();

    private _onBeforeDeletedEntities: Set<object>;

    private _prepareEntitiesDeletes: boolean;

    public isEmpty(): boolean {
        return this.size === 0;
    }

    public get size() {
        return this._deletedEntities.size + (this._onBeforeDeletedEntities ? this._onBeforeDeletedEntities.size : 0);
    }

    public add(entity: object) {
        if (this._prepareEntitiesDeletes) {
            if (!this._onBeforeDeletedEntities) {
                this._onBeforeDeletedEntities = new Set<object>();
            }

            this._onBeforeDeletedEntities.add(entity);
            return;
        }

        this._deletedEntities.add(entity);
    }

    public remove(entity: object) {
        this._deletedEntities.delete(entity);
        if (this._onBeforeDeletedEntities) {
            this._onBeforeDeletedEntities.delete(entity);
        }
    }

    public evict(entity: object) {
        if (this._prepareEntitiesDeletes) {
            throwError("InvalidOperationException", "Cannot Evict entity during OnBeforeDelete");
        }

        this._deletedEntities.delete(entity);
    }

    public contains(entity: object): boolean {
        if (this._deletedEntities.has(entity)) {
            return true;
        }

        if (!this._onBeforeDeletedEntities) {
            return false;
        }

        return this._onBeforeDeletedEntities.has(entity);
    }

    public clear() {
        this._deletedEntities.clear();
        if (this._onBeforeDeletedEntities) {
            this._onBeforeDeletedEntities.clear();
        }
    }

    [Symbol.iterator](): Iterator<DeletedEntitiesEnumeratorResult> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const generator = function* () {
            const deletedIterator = self._deletedEntities.values();

            for (const item of deletedIterator) {
                const mapped: DeletedEntitiesEnumeratorResult = {
                    entity: item,
                    executeOnBeforeDelete: true
                }
                yield mapped;
            }

            if (!self._onBeforeDeletedEntities) {
                return;
            }

            for (const item of self._onBeforeDeletedEntities.values()) {
                const mapped: DeletedEntitiesEnumeratorResult = {
                    entity: item,
                    executeOnBeforeDelete: false
                }
                yield mapped;
            }
        };

        return generator();
    }

    public prepareEntitiesDeletes(): IDisposable {
        this._prepareEntitiesDeletes = true;

        return {
            dispose(): void {
                this._prepareEntitiesDeletes = false;
            }
        }
    }
}

export interface DeletedEntitiesEnumeratorResult {
    entity: object;
    executeOnBeforeDelete: boolean;
}


export interface EntityInfoAndResult {
    entity: object;
    info: DocumentInfo;
    result: object;
}
