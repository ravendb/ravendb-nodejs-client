import {EntityToJson} from "./EntityToJson";
import * as uuid from "uuid";
import { IDisposable } from "../../Types/Contracts";
import { IMetadataDictionary } from "./IDocumentSession";
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
import { DocumentConventions } from "../..";
import { ICommandData, CommandType } from "../Commands/CommandData";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient";
import { JsonSerializer } from "../../Mapping/Json";
import { Mapping } from "../../Mapping";
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

    private _externalState: Map<string, object>

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

    public dispose(): void {
        throw new Error("Method not implemented.");
    }

    public getMetadataFor(...args): IMetadataDictionary {
        throw new Error("Method not implemented.");
    }
}
