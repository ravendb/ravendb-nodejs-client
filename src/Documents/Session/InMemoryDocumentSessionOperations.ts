import { EntityToJson } from "./EntityToJson";
import * as uuid from "uuid";
import { IDisposable } from "../../Types/Contracts";
import { IMetadataDictionary, SessionInfo, SessionStoreOptions, ConcurrencyCheckMode } from "./IDocumentSession";
import { Todo, ObjectTypeDescriptor } from "../../Types";
import { SessionEventsEmitter, SessionBeforeStoreEventArgs, SessionBeforeDeleteEventArgs } from "./SessionEvents";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { ObjectMapper } from "../../Utility/Mapping";
import { IDocumentStore } from "../IDocumentStore";
import CurrentIndexAndNode from "../../Http/CurrentIndexAndNode";
import { throwError, getError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { DocumentsById } from "./DocumentsById";
import { DocumentInfo } from "./DocumentInfo";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { DocumentConventions, DocumentStore, AggressiveCacheOptions } from "../..";
import { 
    ICommandData, 
    CommandType, 
    DeleteCommandData, 
    SaveChangesData, 
    PutCommandDataWithJson 
} from "../Commands/CommandData";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient";
import { JsonSerializer, tryGetConflict } from "../../Mapping/Json";
import { Mapping } from "../../Mapping";
import { CONSTANTS } from "../../Constants";
import { DateUtil } from "../../Utility/DateUtil";
import { IncludesUtil } from "./IncludesUtil";
import { TypeUtil } from "../../Utility/TypeUtil";
import { AbstractCallback } from "../../Types/Callbacks";
import { DocumentType } from "../DocumentAbstractions";
import { IdTypeAndName } from "../IdTypeAndName";
import { BatchOptions } from "../Commands/Batches/BatchOptions";
import { DocumentsChanges } from "./DocumentsChanges";
import { EventEmitter } from "events";
import { JsonOperation } from "../../Mapping/JsonOperation";

export abstract class InMemoryDocumentSessionOperations 
    extends EventEmitter
    implements IDisposable, SessionEventsEmitter, Todo {

    private static _clientSessionIdCounter: number = 0;

    protected _clientSessionId: number = ++InMemoryDocumentSessionOperations._clientSessionIdCounter;

    protected _requestExecutor: RequestExecutor;

    protected _pendingLazyOperations = [];

    protected static _instancesCounter: number = 0;

    private _hash = ++InMemoryDocumentSessionOperations._instancesCounter;

    private _disposed: boolean;

    protected _jsonSerializer: JsonSerializer = JsonSerializer.getDefaultForCommandPayload();

    private _id: string;

    public get id() {
        return this._id;
    }

    protected deletedEntities: Set<object> = new Set();

    protected _knownMissingIds: Set<string> = new Set();

    private _externalState: Map<string, object>;

    public get externalState() {
        if (!this._externalState) {
            this._externalState = new Map();
        }

        return this._externalState;
    }

    public getCurrentSessionNode(): Promise<ServerNode> {
        let result: Promise<CurrentIndexAndNode>;
        switch (this._documentStore.conventions.readBalanceBehavior) {
            case "None":
                result = this._requestExecutor.getPreferredNode();
                break;
            case "RoundRobin":
                result = this._requestExecutor.getNodeBySessionId(this._clientSessionId);
                break;
            case "FastestNode":
                result = this._requestExecutor.getFastestNode();
                break;
            default:
                return Promise.reject(
                    getError("InvalidArgumentException", this._documentStore.conventions.readBalanceBehavior));
        }

        return result.then(x => x.currentNode);
    }

    public documentsById: DocumentsById = new DocumentsById();

    public includedDocumentsById: Map<string, DocumentInfo> = new Map();

    public documentsByEntity: Map<object, DocumentInfo> = new Map();

    protected _documentStore: DocumentStoreBase;

    private _databaseName: string;

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

    private _numberOfRequests: number;

    public get numberOfRequests() {
        return this._numberOfRequests;
    }

    public getNumberOfEntitiesInUnitOfWork() {
        return this.documentsByEntity.size;
    }

    public storeIdentifier(): string {
        return `${this._documentStore.identifier};${this._databaseName}`;
    }

    public get conventions(): DocumentConventions {
        return this._requestExecutor.conventions;
    }

    public maxNumberOfRequestsPerSession: number;

    public useOptimisticConcurrency: boolean;

    protected _deferredCommands: ICommandData[] = [];

    // keys are produced with CommandIdTypeAndName.keyFor() method
    protected _deferredCommandsMap: Map<string, ICommandData> = new Map();

    public get deferredCommandsCount() {
        return this._deferredCommands.length;
    }

    private _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;

    public get generateEntityIdOnTheClient() {
        return this._generateEntityIdOnTheClient;
    }

    private _entityToJson: EntityToJson;

    public get entityToJson() {
        return this._entityToJson;
    }

    protected _sessionInfo: SessionInfo;

    protected constructor(
        databaseName: string,
        documentStore: DocumentStoreBase,
        requestExecutor: RequestExecutor,
        id: string) {
        super();

        this._id = id;
        this._databaseName = databaseName;
        this._documentStore = documentStore;
        this._requestExecutor = requestExecutor;

        this.useOptimisticConcurrency = this._requestExecutor.conventions.isUseOptimisticConcurrency();
        this.maxNumberOfRequestsPerSession = this._requestExecutor.conventions.maxNumberOfRequestsPerSession;
        this._generateEntityIdOnTheClient =
            new GenerateEntityIdOnTheClient(this._requestExecutor.conventions, (obj) => this._generateId(obj));
        this._entityToJson = new EntityToJson(this);

        this._sessionInfo = new SessionInfo(this._clientSessionId);
    }

    protected abstract _generateId(entity: object): string;

    /**
     * Gets the metadata for the specified entity.
     * @param <T> instance class
     * @param instance Instance to get metadata from
     * @return document metadata
     */
    public getMetadataFor<T extends object>(instance: T): IMetadataDictionary {
        if (!instance) {
            throwError("InvalidOperationException", "Instance cannot be null or undefined.");
        }

        const documentInfo = this._getDocumentInfo(instance);
        const metadataInstance = documentInfo.metadataInstance;
        if (metadataInstance) {
            return metadataInstance;
        }

        const metadata = documentInfo.metadata;
        documentInfo.metadataInstance = metadata;
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
            || id[id.length - 1] === "/") {
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
     * @param <T> instance class
     * @param instance Instance to get change vector from
     * @return change vector
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
        const lastModified = documentInfo.metadata[CONSTANTS.Documents.Metadata.LAST_MODIFIED];
        return DateUtil.parse(lastModified);
    }

    /**
     * Returns whether a document with the specified id is loaded in the
     * current session
     * @param id Document id to check
     * @return true is document is loaded
     */
    public isLoaded(id: string): boolean {
        return this.isLoadedOrDeleted(id);
    }

    public isLoadedOrDeleted(id: string): boolean {
        const documentInfo = this.documentsById.getValue(id);
        return !!(documentInfo && documentInfo.document)
            || this.isDeleted(id)
            || this.includedDocumentsById.has(id);
    }

    /**
     * Returns whether a document with the specified id is deleted
     * or known to be missing
     * @param id Document id to check
     * @return true is document is deleted
     */
    public isDeleted(id: string): boolean {
        return this._knownMissingIds.has(id);
    }

    /**
     * Gets the document id.
     * @param instance instance to get document id from
     * @return document id
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
                // tslint:disable:max-line-length
                `The maximum number of requests (${this.maxNumberOfRequestsPerSession}) allowed for this session has been reached.` +
                "Raven limits the number of remote calls that a session is allowed to make as an early warning system. Sessions are expected to be short lived, and " +
                "Raven provides facilities like load(String[] keys) to load multiple documents at once and batch saves (call SaveChanges() only once)." +
                "You can increase the limit by setting DocumentConvention.MaxNumberOfRequestsPerSession or MaxNumberOfRequestsPerSession, but it is" +
                "advisable that you'll look into reducing the number of remote calls first, since that will speed up your application significantly and result in a" +
                // tslint:enable:max-line-length
                "more responsive application.");
        }
    }

    public checkIfIdAlreadyIncluded(ids: string[], includes: Map<string, ObjectTypeDescriptor>): boolean;
    public checkIfIdAlreadyIncluded(ids: string[], includes: string[]): boolean;
    public checkIfIdAlreadyIncluded(ids: string[], includes: string[] | Map<string, ObjectTypeDescriptor>): boolean {
        let includesList: string[];
        if (includes instanceof Map) {
            includesList = Array.from((includes as Map<string, ObjectTypeDescriptor>).keys());
        }

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

            if (!documentInfo.entity) {
                return false;
            }

            if (!includes) {
                continue;
            }

            for (const include of includesList) {
                let hasAll: boolean = true;

                IncludesUtil.include(documentInfo.document, include, (id: string) => {
                    hasAll = hasAll && this.isLoaded(id);
                });

                if (!hasAll[0]) {
                    return false;
                }

            }

        }

        return true;
    }

    /**
     * Tracks the entity inside the unit of work
     * @param <T> entity class
     * @param clazz entity class
     * @param documentFound Document info
     * @param entityType Entity class
     * @param id Id of document
     * @param document raw entity
     * @param metadata raw document metadata
     * @param noTracking no tracking
     * @return tracked entity
     */
    //    return (T) this.trackEntity(clazz, documentFound.id, documentFound.document, documentFound.metadata, false);
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
        if (typeof (idOrDocumentInfo) !== "string") {
            const info = idOrDocumentInfo as DocumentInfo;
            return this.trackEntity(entityType, info.id, info.document, info.metadata, false) as T;
        } else {
            id = idOrDocumentInfo as string;
        }

        if (!id) {
            return this._deserializeFromTransformer(entityType, null, document) as T;
        }

        let docInfo: DocumentInfo = this.documentsById.getValue(id);
        if (docInfo) {
            // the local instance may have been changed, we adhere to the current Unit of Work
            // instance, and return that, ignoring anything new.

            if (!docInfo.entity) {
                docInfo.entity = this.entityToJson.convertToEntity(entityType, id, document);
            }

            if (!noTracking) {
                this.includedDocumentsById.delete(id);
                this.documentsByEntity.set(docInfo.entity, docInfo);
            }

            return docInfo.entity as T;
        }

        docInfo = this.includedDocumentsById.get(id);
        if (docInfo) {
            if (!docInfo.entity) {
                docInfo.entity = this.entityToJson.convertToEntity(entityType, id, document);
            }

            if (!noTracking) {
                this.includedDocumentsById.delete(id);
                this.documentsById.add(docInfo);
                this.documentsByEntity.set(docInfo.entity, docInfo);
            }

            return docInfo.entity as T;
        }

        const entity = this.entityToJson.convertToEntity(entityType, id, document);

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
            this.documentsByEntity.set(entity, newDocumentInfo);
        }

        return entity as T;
    }

    private _deserializeFromTransformer(clazz: ObjectTypeDescriptor, id: string, document: object): object {
        // TBD handleInternalMetadata(document);
        return this.entityToJson.convertToEntity(clazz, id, document);
    }

    public registerIncludes(includes: object): void {
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

    public registerMissingIncludes(results: object[], includes: object, includePaths: string[]): void {
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

    public registerMissing(id: string): void {
        this._knownMissingIds.add(id.toLowerCase());
    }

    public unregisterMissing(id: string) {
        this._knownMissingIds.delete(id.toLowerCase());
    }

    // public void store(Object entity) {
    //     Reference<String> stringReference = new Reference<>();
    //     boolean hasId = generateEntityIdOnTheClient.tryGetIdFromInstance(entity, stringReference);
    //     storeInternal(entity, null, null, !hasId ? ConcurrencyCheckMode.FORCED : ConcurrencyCheckMode.AUTO);
    // }

    // public void store(Object entity, String id) {
    //     storeInternal(entity, null, id, ConcurrencyCheckMode.AUTO);
    // }

    // public void store(Object entity, String changeVector, String id) {
    //     storeInternal(entity, changeVector, id, changeVector == null ? ConcurrencyCheckMode.DISABLED : ConcurrencyCheckMode.FORCED);
    // }

    public store<TEntity extends object>(
        entity: TEntity,
        id?: string,
        callback?: AbstractCallback<TEntity>): void;
    public store<TEntity extends object>(
        entity: TEntity,
        id?: string,
        options?: SessionStoreOptions<TEntity>,
        callback?: AbstractCallback<TEntity>): void;
    public store<TEntity extends object>(
        entity: TEntity,
        id?: string,
        optionsOrCallback?: SessionStoreOptions<TEntity> | AbstractCallback<TEntity>,
        callback?: AbstractCallback<TEntity>): void {

        let options: SessionStoreOptions<TEntity>;
        if (TypeUtil.isFunction(optionsOrCallback)) {
            callback = optionsOrCallback as AbstractCallback<TEntity>;
            options = {};
        } else if (TypeUtil.isObject(optionsOrCallback)) {
            options = optionsOrCallback as SessionStoreOptions<TEntity> || {};
            callback = callback || TypeUtil.NOOP;
        }

        const changeVector = options.changeVector;
        const documentType = options.documentType;
        let forceConcurrencyCheck: ConcurrencyCheckMode;
        if (!TypeUtil.isUndefined(changeVector)) {
            forceConcurrencyCheck = changeVector === null ? "Disabled" : "Forced";
        } else if (!TypeUtil.isUndefined(id)) {
            forceConcurrencyCheck = "Auto";
        } else {
            const hasId = this._generateEntityIdOnTheClient.tryGetIdFromInstance(entity);
            forceConcurrencyCheck = !hasId ? "Forced" : "Auto";
        }

        this._storeInternal(entity, changeVector, id, forceConcurrencyCheck, documentType);
    }

    protected _generateDocumentKeysOnStore: boolean = true;

    private _storeInternal(
        entity: object,
        changeVector: string,
        id: string,
        forceConcurrencyCheck: ConcurrencyCheckMode,
        documentType: DocumentType): Promise<void> {
        if (!entity) {
            throwError("InvalidArgumentException", "Entity cannot be null or undefined.");
        }

        const value = this.documentsByEntity.get(entity);
        if (value) {
            value.changeVector = changeVector || value.changeVector;
            value.concurrencyCheckMode = forceConcurrencyCheck;
            return;
        }

        if (!id) {
            if (this._generateDocumentKeysOnStore) {
                id = this._generateEntityIdOnTheClient.generateDocumentKeyForStorage(entity);
            } else {
                this._rememberEntityForDocumentIdGeneration(entity);
            }
        } else {
            this.generateEntityIdOnTheClient.trySetIdentity(entity, id);
        }

        const cmdKey = IdTypeAndName.keyFor(id, "CLIENT_ANY_COMMAND", null);
        if (this._deferredCommandsMap.has(cmdKey)) {
            throwError("InvalidOperationException",
                "Can't store document, there is a deferred command registered "
                + "for this document in the session. Document id: " + id);
        }

        if (this.deletedEntities.has(entity)) {
            throwError("InvalidOperationException",
                "Can't store object, it was already deleted in this session.  Document id: " + id);
        }

        // we make the check here even if we just generated the ID
        // users can override the ID generation behavior, and we need
        // to detect if they generate duplicates.
        this._assertNoNonUniqueInstance(entity, id);

        const conventions = this._requestExecutor.conventions;
        const collectionName: string = conventions.getCollectionNameForEntity(entity);
        const metadata = {};
        if (collectionName) {
            metadata[CONSTANTS.Documents.Metadata.COLLECTION] = collectionName;
        }

        const entityType = documentType
            ? conventions.findEntityType(documentType)
            : conventions.getEntityTypeDescriptor(entity);
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
        this.deletedEntities.delete(entity);

        if (!id) {
            this._knownMissingIds.delete(id);
        }

        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.metadata = metadata;
        documentInfo.changeVector = changeVector;
        documentInfo.concurrencyCheckMode = forceConcurrencyCheck;
        documentInfo.entity = entity;
        documentInfo.newDocument = true;
        documentInfo.document = null;

        this.documentsByEntity.set(entity, documentInfo);

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

        this._deferredCommands.length = 0;
        this._deferredCommandsMap.clear();

        this._prepareForEntitiesDeletion(result, null);
        this._prepareForEntitiesPuts(result);

        if (this._deferredCommands.length) {
            // this allow OnBeforeStore to call Defer during the call to include
            // additional values during the same SaveChanges call
            result.deferredCommands.push(...this._deferredCommands);
            for (const item of this._deferredCommandsMap.entries()) {
                const [key, value] = item;
                result.deferredCommandsMap.set(key, value);
            }

            this._deferredCommands.length = 0;
            this._deferredCommandsMap.clear();
        }

        return result;
    }

    private _newSaveChangesData(): SaveChangesData {
        return new SaveChangesData({
            deferredCommands: [...this._deferredCommands],
            deferredCommandsMap: new Map(this._deferredCommandsMap),
            options: this._saveChangesOptions
        });
    }
    
    private _prepareForEntitiesDeletion(result: SaveChangesData, changes: Map<String, DocumentsChanges[]>): void {
        for (const deletedEntity of this.deletedEntities) {
            let documentInfo = this.documentsByEntity.get(deletedEntity);
            if (!documentInfo) {
                continue;
            }

            if (changes) {
                const docChanges = [];
                const change = new DocumentsChanges();
                change.fieldNewValue = "";
                change.fieldOldValue = "";
                change.change = "DOCUMENT_DELETED";

                docChanges.push(change);
                changes.set(documentInfo.id, docChanges);
            } else {
                const command: ICommandData = 
                    result.deferredCommandsMap.get(IdTypeAndName.keyFor(documentInfo.id, "CLIENT_ANY_COMMAND", null));
                if (command) {
                    InMemoryDocumentSessionOperations._throwInvalidDeletedDocumentWithDeferredCommand(command);
                }

                let changeVector = null;
                documentInfo = this.documentsById.getValue(documentInfo.id);

                if (documentInfo) {
                    changeVector = documentInfo.changeVector;

                    if (documentInfo.entity) {
                        this.documentsByEntity.delete(documentInfo.entity);
                        result.entities.push(documentInfo.entity);
                    }

                    this.documentsById.remove(documentInfo.id);
                }

                changeVector = this.useOptimisticConcurrency ? changeVector : null;
                const beforeDeleteEventArgs = 
                    new SessionBeforeDeleteEventArgs(this, documentInfo.id, documentInfo.entity);
                this.emit("beforeDelete", beforeDeleteEventArgs);
                result.sessionCommands.push(new DeleteCommandData(documentInfo.id, changeVector));
            }

            if (!changes) {
                this.deletedEntities.clear();
            }
        }

    }

    private _prepareForEntitiesPuts(result: SaveChangesData): void {
        for (const entry of this.documentsByEntity.entries()) {
            const entity = {
                key: entry[0],
                value: entry[1]
            };

            InMemoryDocumentSessionOperations._updateMetadataModifications(entity.value);

            let document = this.entityToJson.convertEntityToJson(entity.key, entity.value);

            if (entity.value.ignoreChanges || !this._entityChanged(document, entity.value, null)) {
                continue;
            }

            const command = result.deferredCommandsMap.get(
                IdTypeAndName.keyFor(entity.value.id, "CLIENT_ANY_COMMAND", null));
            if (command) {
                InMemoryDocumentSessionOperations._throwInvalidModifiedDocumentWithDeferredCommand(command);
            }

            const beforeStoreEventArgs = new SessionBeforeStoreEventArgs(this, entity.value.id, entity.key);
            if (this.emit("beforeStore", beforeStoreEventArgs)) {
                if (beforeStoreEventArgs.isMetadataAccessed()) {
                    InMemoryDocumentSessionOperations._updateMetadataModifications(entity.value);
                }

                if (beforeStoreEventArgs.isMetadataAccessed() || this._entityChanged(document, entity.value, null)) {
                    document = this.entityToJson.convertEntityToJson(entity.key, entity.value);
                }
            }

            entity.value.newDocument = false;
            result.entities.push(entity.key);

            if (entity.value.id) {
                this.documentsById.remove(entity.value.id);
            }

            entity.value.document = document;

            let changeVector: string;
            if (this.useOptimisticConcurrency) {
                if (entity.value.concurrencyCheckMode !== "Disabled") {
                    // if the user didn't provide a change vector, we'll test for an empty one
                    changeVector = entity.value.changeVector || "";
                } else {
                    changeVector = null;
                }
            } else if (entity.value.concurrencyCheckMode === "Forced") {
                changeVector = entity.value.changeVector;
            } else {
                changeVector = null;
            }

            result.sessionCommands.push(
                new PutCommandDataWithJson(entity.value.id, changeVector, document));
        }
    }

    protected _entityChanged(
        newObj: object, 
        documentInfo: DocumentInfo, 
        changes: Map<string, DocumentsChanges[]>): boolean {
        return JsonOperation.entityChanged(newObj, documentInfo, changes);
    }

    private static _throwInvalidModifiedDocumentWithDeferredCommand(resultCommand: ICommandData): void {
        throwError("InvalidOperationException", "Cannot perform save because document " + resultCommand.id
            + " has been deleted by the session and is also taking part in deferred " 
            + resultCommand.type + " command");
    }

    private static _throwInvalidDeletedDocumentWithDeferredCommand(resultCommand: ICommandData): void {
        throwError("InvalidOperationException", "Cannot perform save because document " + resultCommand.id
            + " has been deleted by the session and is also taking part in deferred " 
            + resultCommand.type + " command");
    }
    
    private static _updateMetadataModifications(documentInfo: DocumentInfo) {
        if (documentInfo.metadataInstance) {
            for (const prop of Object.keys(documentInfo.metadataInstance)) {
                documentInfo.metadata[prop] = documentInfo.metadataInstance[prop]; 
            }
        }
    }

    public dispose(): void {
        throw new Error("Method not implemented.");
    }
}
