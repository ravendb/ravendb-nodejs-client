import {EntityToJson} from "./EntityToJson";
import * as uuid from "uuid";
import { IDisposable } from "../../Types/Contracts";
import { IMetadataDictionary, SessionInfo } from "./IDocumentSession";
import { Todo } from "../../Types";
import { SessionEventsEmitter, SessionBeforeStoreEventArgs } from "./SessionEvents";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { ObjectMapper } from "../../Utility/Mapping";
import { IDocumentStore } from "../IDocumentStore";
import CurrentIndexAndNode from "../../Http/CurrentIndexAndNode";
import { throwError, getError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { DocumentsById } from "./DocumentsById";
import { DocumentInfo } from "./DocumentInfo";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { DocumentConventions, DocumentStore } from "../..";
import { ICommandData, CommandType } from "../Commands/CommandData";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient";
import { JsonSerializer } from "../../Mapping/Json";
import { Mapping } from "../../Mapping";
import { CONSTANTS } from "../../Constants";
import { DateUtil } from "../../Utility/DateUtil";
export abstract class InMemoryDocumentSessionOperations implements IDisposable, SessionEventsEmitter, Todo {
    
    public removeListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;
    public removeListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): void;
    public removeListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): void;
    public removeListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): void;
    public removeListener(
        eventName: string, eventHandler: (eventArgs: any) => void): this {
        throw new Error("Method not implemented.");
    }
    public on(eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;
    public on(eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): this;
    public on(eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): this;
    public on(eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): this;
    public on(eventName: string, eventHandler: (eventArgs: any) => void): this;
    public on(eventName: string, eventHandler: (eventArgs: any) => void): this {
        throw new Error("Method not implemented.");
    }

    private static _clientSessionIdCounter: number = 0;

    protected _clientSessionId: number = ++InMemoryDocumentSessionOperations._clientSessionIdCounter;

    protected _requestExecutor: RequestExecutor;

    protected _pendingLazyOperations = [];

    protected static _instancesCounter: number = 0;

    private _hash = ++InMemoryDocumentSessionOperations._instancesCounter;

    private _disposed: boolean;

    protected _jsonSerializer: JsonSerializer = Mapping.getDefaultJsonSerializer();

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
    protected deferredCommandsMap: Map<string, ICommandData> = new Map();

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

    public dispose(): void {
        throw new Error("Method not implemented.");
    }
}
