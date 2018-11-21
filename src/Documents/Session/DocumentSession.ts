import * as stream from "readable-stream";
import * as os from "os";
import { DocumentQuery } from "./DocumentQuery";
import { MultiLoaderWithInclude } from "./Loaders/MultiLoaderWithInclude";
import { BatchOperation } from "./Operations/BatchOperation";
import * as BluebirdPromise from "bluebird";
import {
    IDocumentSession,
    LoadOptions,
    ConcurrencyCheckMode,
    SessionLoadStartingWithOptions,
    IDocumentSessionImpl,
    SessionLoadInternalParameters,
} from "./IDocumentSession";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { AbstractCallback } from "../../Types/Callbacks";
import { TypeUtil } from "../../Utility/TypeUtil";
import { IRavenObject, EntitiesCollectionObject, ObjectTypeDescriptor } from "../../Types";
import { throwError } from "../../Exceptions";
import { DocumentType } from "../DocumentAbstractions";
import { LoadOperation } from "./Operations/LoadOperation";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { DocumentStore } from "../DocumentStore";
import { GetDocumentsCommand } from "../Commands/GetDocumentsCommand";
import { HeadDocumentCommand } from "../Commands/HeadDocumentCommand";
import { LoadStartingWithOperation } from "./Operations/LoadStartingWithOperation";
import { ILoaderWithInclude } from "./Loaders/ILoaderWithInclude";
import { IRawDocumentQuery } from "./IRawDocumentQuery";
import { RawDocumentQuery } from "./RawDocumentQuery";
import { BatchCommand } from "../Commands/Batches/BatchCommand";
import { AdvancedDocumentQueryOptions, DocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";
import { IAttachmentsSessionOperations } from "./IAttachmentsSessionOperations";
import { DocumentSessionAttachments } from "./DocumentSessionAttachments";
import { IEagerSessionOperations } from "./Operations/Lazy/IEagerSessionOperations";
import { Lazy } from "../Lazy";
import { LazyLoadOperation } from "./Operations/Lazy/LazyLoadOperation";
import { ILazyOperation } from "./Operations/Lazy/ILazyOperation";
import { ResponseTimeInformation } from "./ResponseTimeInformation";
import { GetRequest } from "../Commands/MultiGet/GetRequest";
import { MultiGetOperation } from "./Operations/MultiGetOperation";
import { Stopwatch } from "../../Utility/Stopwatch";
import { GetResponse } from "../Commands/MultiGet/GetResponse";
import { CONSTANTS, HEADERS } from "../../Constants";
import { delay, passResultToCallback } from "../../Utility/PromiseUtil";
import { ILazySessionOperations } from "./Operations/Lazy/ILazySessionOperations";
import { LazySessionOperations } from "./Operations/Lazy/LazySessionOperations";
import { JavaScriptArray } from "./JavaScriptArray";
import { PatchRequest } from "../Operations/PatchRequest";
import { PatchCommandData } from "../Commands/Batches/PatchCommandData";
import { IdTypeAndName } from "../IdTypeAndName";
import { IRevisionsSessionOperations } from "./IRevisionsSessionOperations";
import { DocumentSessionRevisions } from "./DocumentSessionRevisions";
import * as StreamUtil from "../../Utility/StreamUtil";
import { StreamResult } from "../Commands/StreamResult";
import { DocumentResultStream } from "./DocumentResultStream";
import { StreamOperation } from "./Operations/StreamOperation";
import { QueryOperation } from "./Operations/QueryOperation";
import { StreamQueryStatisticsCallback } from "./IAdvancedSessionOperations";
import { streamResultsIntoStream } from "../../Mapping/Json/Streams/Pipelines";
import { IClusterTransactionOperations } from "./IClusterTransactionOperations";
import { ClusterTransactionOperations } from "./ClusterTransactionOperations";
import { ClusterTransactionOperationsBase } from "./ClusterTransactionOperationsBase";
import { SessionOptions } from "./SessionOptions";
import { ISessionDocumentCounters } from "./ISessionDocumentCounters";
import { SessionDocumentCounters } from "./SessionDocumentCounters";
import { IncludeBuilder } from "./Loaders/IncludeBuilder";

export interface IStoredRawEntityInfo {
    originalValue: object;
    metadata: object;
    originalMetadata: object;
    id: string;
    changeVector?: string | null;
    expectedChangeVector?: string | null;
    concurrencyCheckMode: ConcurrencyCheckMode;
    documentType: DocumentType;
}

export class DocumentSession extends InMemoryDocumentSessionOperations
    implements IDocumentSession, IDocumentSessionImpl {

    public constructor(documentStore: DocumentStore, id: string, options: SessionOptions) {
        super(documentStore, id, options);

    }

    public get advanced() {
        return this;
    }

    public get session(): InMemoryDocumentSessionOperations {
        return this;
    }

    protected _generateId(entity: object): Promise<string> {
        return this.conventions.generateDocumentId(this.databaseName, entity);
    }

    public numberOfRequestsInSession: number;

    public conventions: DocumentConventions;

    public async load<TEntity extends object = IRavenObject>(
        id: string,
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    public async load<TEntity extends object = IRavenObject>(
        id: string,
        options?: LoadOptions<TEntity>,
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    public async load<TEntity extends object = IRavenObject>(
        id: string,
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    public async load<TEntity extends object = IRavenObject>(
        ids: string[],
        callback?: AbstractCallback<EntitiesCollectionObject<TEntity>>): Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends object = IRavenObject>(
        ids: string[],
        options?: LoadOptions<TEntity>,
        callback?: AbstractCallback<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends object = IRavenObject>(
        ids: string[],
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends object = IRavenObject>(
        idOrIds: string | string[],
        optionsOrCallback?:
            DocumentType<TEntity> | LoadOptions<TEntity> |
            AbstractCallback<TEntity | EntitiesCollectionObject<TEntity>>,
        callback?: AbstractCallback<TEntity | EntitiesCollectionObject<TEntity>>)
        : Promise<TEntity | EntitiesCollectionObject<TEntity>> {

        const isLoadingSingle = !Array.isArray(idOrIds);
        const ids = !isLoadingSingle ? idOrIds as string[] : [idOrIds as string];

        let options: LoadOptions<TEntity>;
        if (TypeUtil.isDocumentType(optionsOrCallback)) {
            options = { documentType: optionsOrCallback as DocumentType<TEntity> };
        } else if (TypeUtil.isFunction(optionsOrCallback)) {
            callback = optionsOrCallback as AbstractCallback<TEntity> || TypeUtil.NOOP;
        } else if (TypeUtil.isObject(optionsOrCallback)) {
            options = optionsOrCallback as LoadOptions<TEntity>;
        }

        callback = callback || TypeUtil.NOOP;

        const internalOpts = this._prepareLoadInternalOpts(options || {});
        const loadInternalPromise = this.loadInternal(ids, internalOpts)
            .then((docs: EntitiesCollectionObject<TEntity> | TEntity) => {
                return isLoadingSingle
                    ? docs[Object.keys(docs)[0]]
                    : docs;
            });

        passResultToCallback(loadInternalPromise, callback);

        return loadInternalPromise;
    }

    private _prepareLoadInternalOpts<TEntity extends object>(options: LoadOptions<TEntity>) {
        const internalOpts: SessionLoadInternalParameters<TEntity> = { documentType: options.documentType };
        this.conventions.tryRegisterEntityType(internalOpts.documentType);
        if ("includes" in options) {
            if (TypeUtil.isFunction(options.includes)) {
                const builder = new IncludeBuilder(this.conventions);
                options.includes(builder);
                
                if (builder.countersToInclude) {
                    internalOpts.counterIncludes = [...builder.countersToInclude];
                }

                if (builder.documentsToInclude) {
                    internalOpts.includes = [...builder.documentsToInclude];
                }

                internalOpts.includeAllCounters = builder.isAllCounters;
            } else {
                internalOpts.includes = options.includes as string[];
            } 
        }

        return internalOpts;
    }

    private async _loadInternal(
        ids: string[],
        operation: LoadOperation, 
        writable: stream.Writable): Promise<void>;
    private async _loadInternal(
        ids: string[],
        operation: LoadOperation, writable?: stream.Writable)
        : Promise<void> {
        if (!ids) {
            throwError("InvalidArgumentException", "Ids cannot be null");
        }

        operation.byIds(ids);

        const command = operation.createRequest();
        if (command) {
            await this._requestExecutor.execute(command, this._sessionInfo);
            if (!writable) {
                operation.setResult(command.result);
            } else {
                const readable = StreamUtil.stringToReadable(JSON.stringify(command.result));
                await StreamUtil.pipelineAsync(readable, writable);
            }
        }
    }

    public async saveChanges(): Promise<void>;
    public async saveChanges(callback?: AbstractCallback<void>): Promise<void>;
    public async saveChanges(callback?: AbstractCallback<void>): Promise<void> {
        callback = callback || TypeUtil.NOOP;
        const result = this._saveChanges();
        passResultToCallback(result, callback);
        return result;
    }

    private async _saveChanges() {
        const saveChangeOperation = new BatchOperation(this);
        let command: BatchCommand;
        try {
            command = saveChangeOperation.createRequest();
            if (!command) {
                return;
            }

            if (this.noTracking) {
                throwError(
                    "InvalidOperationException",
                    "Cannot execute saveChanges when entity tracking is disabled in session.");
            }

            await this._requestExecutor.execute(command, this._sessionInfo);
            this._updateSessionAfterSaveChanges(command.result);
            saveChangeOperation.setResult(command.result);
        } finally {
            if (command) {
                command.dispose();
            }
        }
    }

    /**
     * Refreshes the specified entity from Raven server.
     */
    public async refresh<TEntity extends object>(entity: TEntity): Promise<void> {
        const documentInfo = this.documentsByEntity.get(entity);
        if (!documentInfo) {
            throwError("InvalidOperationException", "Cannot refresh a transient instance");
        }

        this.incrementRequestCount();

        const command = new GetDocumentsCommand({
            id: documentInfo.id,
            conventions: this.conventions
        });

        await this._requestExecutor.execute(command, this._sessionInfo);
        this._refreshInternal(entity, command, documentInfo);
    }

    /**
     * Check if document exists without loading it
     */
    public async exists(id: string): Promise<boolean> {
        if (!id) {
            throwError("InvalidArgumentException", "id cannot be null");
        }

        if (this._knownMissingIds.has(id)) {
            return Promise.resolve(false);
        }

        if (this.documentsById.getValue(id)) {
            return true;
        }

        const command = new HeadDocumentCommand(id, null);

        await this._requestExecutor.execute(command, this._sessionInfo);
        return !TypeUtil.isNullOrUndefined(command.result);
    }

    public async loadStartingWith<TEntity extends object>(
        idPrefix: string,
        callback?: AbstractCallback<TEntity[]>): Promise<TEntity[]>;
    public async loadStartingWith<TEntity extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<TEntity>,
        callback?: AbstractCallback<TEntity[]>): Promise<TEntity[]>;
    public async loadStartingWith<TEntity extends object>(
        idPrefix: string,
        optsOrCallback?: SessionLoadStartingWithOptions<TEntity> | AbstractCallback<TEntity[]>,
        callback?: AbstractCallback<TEntity[]>): Promise<TEntity[]> {

        const loadStartingWithOperation = new LoadStartingWithOperation(this);
        let opts: SessionLoadStartingWithOptions<TEntity>;
        if (TypeUtil.isFunction(optsOrCallback)) {
            callback = optsOrCallback as AbstractCallback<TEntity[]>;
        } else {
            opts = optsOrCallback as SessionLoadStartingWithOptions<TEntity>;
        }

        opts = opts || {};
        callback = callback || TypeUtil.NOOP;

        const result = this._loadStartingWithInternal(idPrefix, loadStartingWithOperation, opts)
            .then(() => loadStartingWithOperation.getDocuments<TEntity>(opts.documentType));
        passResultToCallback(result, callback);
        return result;
    }

    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable,
        callback?: AbstractCallback<void>): Promise<void>;
    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable,
        opts: SessionLoadStartingWithOptions<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;
    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable,
        optsOrCallback?: SessionLoadStartingWithOptions<TEntity> | AbstractCallback<void>,
        callback?: AbstractCallback<void>): Promise<void> {

        if (!writable) {
            throwError("InvalidArgumentException", "writable cannot be null.");
        }
        if (!idPrefix) {
            throwError("InvalidArgumentException", "idPrefix cannot be null.");
        }

        const loadStartingWithOperation = new LoadStartingWithOperation(this);
        let opts: SessionLoadStartingWithOptions<TEntity>;
        if (TypeUtil.isFunction(optsOrCallback)) {
            callback = optsOrCallback as AbstractCallback<void>;
        } else {
            opts = optsOrCallback as SessionLoadStartingWithOptions<TEntity>;
        }

        opts = opts || {};
        callback = callback || TypeUtil.NOOP;
        const result = this._loadStartingWithInternal(idPrefix, loadStartingWithOperation, opts, writable)
        // tslint:disable-next-line:no-empty
            .then(() => {
            });
        passResultToCallback(result, callback);
        return result;
    }

    public async loadIntoStream(
        ids: string[], writable: stream.Writable, callback?: AbstractCallback<void>): Promise<void>;
    public async loadIntoStream(
        ids: string[], writable: stream.Writable): Promise<void>;
    public async loadIntoStream(
        ids: string[], writable: stream.Writable, callback?: AbstractCallback<void>): Promise<void> {
        const result = this._loadInternal(ids, new LoadOperation(this), writable);
        passResultToCallback(result, callback);
        return result;
    }

    private async _loadStartingWithInternal<TEntity extends object>(
        idPrefix: string,
        operation: LoadStartingWithOperation,
        opts: SessionLoadStartingWithOptions<TEntity>,
        writable?: stream.Writable): Promise<GetDocumentsCommand> {
        const { matches, start, pageSize, exclude, startAfter } =
        opts || {} as SessionLoadStartingWithOptions<TEntity>;
        operation.withStartWith(idPrefix, {
            matches, start, pageSize, exclude, startAfter
        });

        const command = operation.createRequest();
        if (command) {
            await this._requestExecutor.execute(command, this._sessionInfo);
            if (writable) {
                return StreamUtil.pipelineAsync(
                    StreamUtil.stringToReadable(JSON.stringify(command.result)),
                    writable);
            } else {
                operation.setResult(command.result);
            }
        }

        return command;
    }

    public async loadInternal<TResult extends object>(
        ids: string[], opts: SessionLoadInternalParameters<TResult>):
        Promise<EntitiesCollectionObject<TResult>> {
        if (!ids) {
            throwError("InvalidArgumentException", "Ids cannot be null");
        }

        opts = opts || {};

        const loadOperation = new LoadOperation(this);
        loadOperation.byIds(ids);

        loadOperation.withIncludes(opts.includes);

        if (opts.includeAllCounters) {
            loadOperation.withAllCounters();
        } else {
            loadOperation.withCounters(opts.counterIncludes);
        }

        const command = loadOperation.createRequest();
        if (command) {
            await this._requestExecutor.execute(command, this._sessionInfo);
            loadOperation.setResult(command.result);
        }

        const clazz = this.conventions.findEntityType(opts.documentType);
        return loadOperation.getDocuments(clazz);
    }

    /**
     * Begin a load while including the specified path
     */
    public include(path: string): ILoaderWithInclude {
        return new MultiLoaderWithInclude(this).include(path);
    }

    public increment<T extends object, UValue>(id: string, path: string, valueToAdd: UValue): void;
    public increment<T extends object, UValue>(entity: T, path: string, valueToAdd: UValue): void;
    public increment<T extends object, UValue>(entityOrId: T | string, path: string, valueToAdd: UValue): void {
        let id: string;
        if (TypeUtil.isString(entityOrId)) {
            id = entityOrId;
        } else {
            const metadata = this.getMetadataFor(entityOrId as T);
            id = metadata["@id"];
        }

        const patchRequest = new PatchRequest();
        const variable = `this.${path}`;
        const value = `args.val_${this._valsCount}`;
        patchRequest.script = `${variable} = ${variable} ? ${variable} + ${value} : ${value};`;
        const valKey = "val_" + this._valsCount;
        patchRequest.values = { [valKey]: valueToAdd };

        this._valsCount++;

        if (!this._tryMergePatches(id, patchRequest)) {
            this.defer(new PatchCommandData(id, null, patchRequest, null));
        }
    }

    private _valsCount: number = 0;
    private _customCount: number = 0;

    public patch<TEntity extends object, UValue>(
        id: string, path: string, value: UValue): void;
    public patch<TEntity extends object, UValue>(
        entity: TEntity, path: string, value: UValue): void;
    public patch<TEntity extends object, UValue>(
        id: string, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;
    public patch<TEntity extends object, UValue>(
        entity: TEntity, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;
    public patch<TEntity extends object, UValue>(
        entityOrId: TEntity | string, path: string,
        valueOrArrayAdder: UValue | ((array: JavaScriptArray<UValue>) => void)): void {

        let id: string;
        if (TypeUtil.isString(entityOrId)) {
            id = entityOrId;
        } else {
            const metadata = this.getMetadataFor(entityOrId as TEntity);
            id = metadata["@id"];
        }

        let patchRequest: PatchRequest;
        if (TypeUtil.isFunction(valueOrArrayAdder)) {
            const scriptArray = new JavaScriptArray(this._customCount++, path);
            valueOrArrayAdder(scriptArray);

            patchRequest = new PatchRequest();
            patchRequest.script = scriptArray.script;
            patchRequest.values = scriptArray.parameters;
        } else { // value
            patchRequest = new PatchRequest();
            patchRequest.script = "this." + path + " = args.val_" + this._valsCount + ";";
            const valKey = "val_" + this._valsCount;
            patchRequest.values = {};
            patchRequest.values[valKey] = valueOrArrayAdder;

            this._valsCount++;
        }

        if (!this._tryMergePatches(id, patchRequest)) {
            this.defer(new PatchCommandData(id, null, patchRequest, null));
        }
    }

    private _tryMergePatches(id: string, patchRequest: PatchRequest): boolean {
        const command = this.deferredCommandsMap.get(IdTypeAndName.keyFor(id, "PATCH", null));
        if (!command) {
            return false;
        }

        const commandIdx = this._deferredCommands.indexOf(command);
        if (commandIdx > -1) {
            this._deferredCommands.splice(commandIdx, 1);
        }

        // We'll overwrite the deferredCommandsMap when calling Defer
        // No need to call deferredCommandsMap.remove((id, CommandType.PATCH, null));

        const oldPatch = command as PatchCommandData;
        const newScript = oldPatch.patch.script + "\n" + patchRequest.script;
        const newVals = {};

        Object.keys(oldPatch.patch.values).forEach(key => {
            newVals[key] = oldPatch.patch.values[key];
        });

        Object.keys(patchRequest.values).forEach(key => {
            newVals[key] = patchRequest.values[key];
        });

        const newPatchRequest = new PatchRequest();
        newPatchRequest.script = newScript;
        newPatchRequest.values = newVals;

        this.defer(new PatchCommandData(id, null, newPatchRequest, null));
        return true;
    }

    public rawQuery<TEntity extends object>(
        query: string, documentType?: DocumentType<TEntity>): IRawDocumentQuery<TEntity> {
        if (documentType) {
            this.conventions.tryRegisterEntityType(documentType);
        }

        return new RawDocumentQuery(this, query, documentType);
    }

    public query<TEntity extends object>(documentType: DocumentType<TEntity>): IDocumentQuery<TEntity>;
    public query<TEntity extends object>(opts: DocumentQueryOptions<TEntity>): IDocumentQuery<TEntity>;
    public query<TEntity extends object>(
        docTypeOrOpts: DocumentType<TEntity> | DocumentQueryOptions<TEntity>): IDocumentQuery<TEntity> {
        if (TypeUtil.isDocumentType(docTypeOrOpts)) {
            return this.documentQuery({
                documentType: docTypeOrOpts as DocumentType<TEntity>
            });
        }

        return this.documentQuery(docTypeOrOpts as DocumentQueryOptions<TEntity>);
    }

    public documentQuery<T extends object>(opts: AdvancedDocumentQueryOptions<T>): IDocumentQuery<T>;
    public documentQuery<T extends object>(documentType: DocumentType<T>): IDocumentQuery<T>;
    public documentQuery<T extends object>(
        documentTypeOrOpts: DocumentType<T> | AdvancedDocumentQueryOptions<T>): IDocumentQuery<T> {
        let opts: AdvancedDocumentQueryOptions<T>;
        if (TypeUtil.isDocumentType(documentTypeOrOpts)) {
            opts = { documentType: documentTypeOrOpts as DocumentType<T> };
        } else {
            opts = documentTypeOrOpts as AdvancedDocumentQueryOptions<T>;
        }

        if (opts.documentType) {
            this.conventions.tryRegisterEntityType(opts.documentType);
        }

        const { indexName, collection } = this._processQueryParameters(opts, this.conventions);
        return new DocumentQuery(opts.documentType, this, indexName, collection, !!opts.isMapReduce);
    }

    protected _processQueryParameters<T extends object>(
        opts: AdvancedDocumentQueryOptions<T>, conventions: DocumentConventions) {
        // tslint:disable-next-line:prefer-const
        let { indexName, collection } = opts;
        const isIndex = !!indexName;
        const isCollection = !!collection;

        if (isIndex && isCollection) {
            throwError("InvalidOperationException",
                "Parameters indexName and collectionName are mutually exclusive. Please specify only one of them.");
        }

        if (!isIndex && !isCollection) {
            const entityType = this.conventions.findEntityType(opts.documentType);
            collection = this.conventions.getCollectionNameForType(entityType) 
                || CONSTANTS.Documents.Metadata.ALL_DOCUMENTS_COLLECTION;
        }

        return { indexName, collection };
    }

    private _attachments: IAttachmentsSessionOperations;

    public get attachments(): IAttachmentsSessionOperations {
        if (!this._attachments) {
            this._attachments = new DocumentSessionAttachments(this);
        }

        return this._attachments;
    }

    private _revisions: IRevisionsSessionOperations;

    public get revisions(): IRevisionsSessionOperations {
        if (!this._revisions) {
            this._revisions = new DocumentSessionRevisions(this);
        }

        return this._revisions;
    }

    private _clusterTransaction: ClusterTransactionOperations;

    public get clusterTransaction(): IClusterTransactionOperations {
        if (!this._clusterTransaction) {
            this._clusterTransaction = new ClusterTransactionOperations(this);
        }
        return this._clusterTransaction;
    }
    
    protected get _clusterSession(): ClusterTransactionOperationsBase {
        return this._clusterTransaction;
    }

    public get lazily(): ILazySessionOperations {
        return new LazySessionOperations(this);
    }

    public get eagerly(): IEagerSessionOperations {
        return this;
    }

    public async executeAllPendingLazyOperations(): Promise<ResponseTimeInformation> {
        const requests: GetRequest[] = [];
        for (let i = this._pendingLazyOperations.length - 1; i >= 0; i -= 1) {
            const op = this._pendingLazyOperations[i];
            const req = op.createRequest();
            if (!req) {
                this._pendingLazyOperations.splice(i, 1);
                continue;
            }

            requests.unshift(req);
        }

        if (!requests.length) {
            return new ResponseTimeInformation();
        }

        try {
            const sw = Stopwatch.createStarted();
            this.incrementRequestCount();
            const responseTimeDuration: ResponseTimeInformation = new ResponseTimeInformation();
            while (await this._executeLazyOperationsSingleStep(responseTimeDuration, requests)) {
                await delay(100);
            }

            responseTimeDuration.computeServerTotal();
            responseTimeDuration.totalClientDuration = sw.elapsed;
            return responseTimeDuration;
        } catch (err) {
            throwError("RavenException", "Unable to execute pending operations.", err);
        } finally {
            this._pendingLazyOperations.length = 0;
        }
    }

    private async _executeLazyOperationsSingleStep(
        responseTimeInformation: ResponseTimeInformation, requests: GetRequest[]): Promise<boolean> {
        const multiGetOperation = new MultiGetOperation(this);
        const multiGetCommand = multiGetOperation.createRequest(requests);
        await this.requestExecutor.execute(multiGetCommand, this._sessionInfo);
        const responses: GetResponse[] = multiGetCommand.result;

        for (let i = 0; i < this._pendingLazyOperations.length; i++) {
            let totalTime: number;
            let tempReqTime: string;
            const response = responses[i];
            tempReqTime = response.headers[HEADERS.REQUEST_TIME];
            totalTime = tempReqTime ? parseInt(tempReqTime, 10) : 0;
            const timeItem = {
                url: requests[i].urlAndQuery,
                duration: totalTime
            };

            responseTimeInformation.durationBreakdown.push(timeItem);
            if (response.requestHasErrors()) {
                throwError(
                    "InvalidOperationException",
                    "Got an error from server, status code: " + response.statusCode + os.EOL + response.result);
            }

            await this._pendingLazyOperations[i].handleResponseAsync(response);
            if (this._pendingLazyOperations[i].requiresRetry) {
                return true;
            }
        }

        return false;
    }

    public addLazyOperation<TLazyResult>(operation: ILazyOperation): Lazy<TLazyResult> {
        this._pendingLazyOperations.push(operation);
        return new Lazy<TLazyResult>(async () => {
            await this.executeAllPendingLazyOperations();
            return operation.result as TLazyResult;
        });
    }

    public addLazyCountOperation(operation: ILazyOperation): Lazy<number> {
        this._pendingLazyOperations.push(operation);
        return new Lazy(async () => {
            await this.executeAllPendingLazyOperations();
            return operation.queryResult.totalResults;
        });
    }

    public lazyLoadInternal<TResult extends object>(
        ids: string[],
        includes: string[],
        clazz: ObjectTypeDescriptor<TResult>): Lazy<EntitiesCollectionObject<TResult>> {

        if (this.checkIfIdAlreadyIncluded(ids, includes)) {
            return new Lazy(() => this.load(ids, { documentType: clazz }));
        }

        const loadOperation = new LoadOperation(this)
            .byIds(ids)
            .withIncludes(includes);

        const lazyOp = new LazyLoadOperation(this, loadOperation, clazz)
            .byIds(ids)
            .withIncludes(includes);

        return this.addLazyOperation(lazyOp);
    }

    public async stream<T extends object>(query: IDocumentQuery<T>): Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(
        query: IDocumentQuery<T>,
        streamQueryStats: StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(
        query: IDocumentQuery<T>,
        streamQueryStats: StreamQueryStatisticsCallback,
        callback: AbstractCallback<DocumentResultStream<T>>)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(query: IRawDocumentQuery<T>)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(
        query: IRawDocumentQuery<T>,
        streamQueryStats: StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(idPrefix: string)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(idPrefix: string, opts: SessionLoadStartingWithOptions<T>)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<T>,
        callback: AbstractCallback<DocumentResultStream<T>>)
        : Promise<DocumentResultStream<T>>;
    public async stream<T extends object>(
        queryOrIdPrefix: string | IDocumentQuery<T> | IRawDocumentQuery<T>,
        optsOrStatsCallback?: SessionLoadStartingWithOptions<T> | StreamQueryStatisticsCallback,
        callback?: AbstractCallback<DocumentResultStream<T>>)
        : Promise<DocumentResultStream<T>> {
        const result = (this._stream as any)(...Array.from(arguments) as any);
        passResultToCallback(result, callback);
        return result;
    }

    private async _stream<T extends object>(
        queryOrIdPrefix: string | IDocumentQuery<T> | IRawDocumentQuery<T>,
        optsOrStatsCallback?: SessionLoadStartingWithOptions<T> | StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>> {
        if (TypeUtil.isString(queryOrIdPrefix)) {
            return this._streamStartingWith<T>(
                queryOrIdPrefix as string, optsOrStatsCallback as object);
        }

        if (arguments.length > 1 && typeof optsOrStatsCallback !== "function") {
            throwError("InvalidArgumentException", "Statistics callback must be a function.");
        }

        return this._streamQueryResults(
            queryOrIdPrefix as (IDocumentQuery<T> | IRawDocumentQuery<T>),
            optsOrStatsCallback as StreamQueryStatisticsCallback);
    }

    private async _streamStartingWith<T extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<T>)
        : Promise<DocumentResultStream<T>> {
        const streamOperation = new StreamOperation(this);
        const command = streamOperation.createRequest(idPrefix, opts);

        await this.requestExecutor.execute(command, this.sessionInfo);
        const docsReadable = streamOperation.setResult(command.result);
        let clazz = null;
        if (opts && "documentType" in opts) {
            clazz = this.conventions.findEntityType(opts.documentType);
        }

        const result = this._getStreamResultTransform(this, clazz, null);

        result.on("newListener", (event, listener) => {
            if (event === "data") {
                result.resume();
            }
        });

        result.on("removeListener", (event, listener) => {
            if (event === "data") {
                result.pause();
            }
        });

        return stream.pipeline(docsReadable, result) as DocumentResultStream<T>;
    }

    private async _streamQueryResults<T extends object>(
        query: IDocumentQuery<T> | IRawDocumentQuery<T>,
        streamQueryStatsCallback?: StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>> {
        const streamOperation = new StreamOperation(this);
        const command = streamOperation.createRequest(query.getIndexQuery());

        await this.requestExecutor.execute(command, this.sessionInfo);
        const docsReadable = streamOperation.setResult(command.result);

        const result = this._getStreamResultTransform(
            this, (query as any).getQueryType(), (query as any).fieldsToFetchToken);

        docsReadable.once("stats", stats => {
            (streamQueryStatsCallback || TypeUtil.NOOP)(stats);
            result.emit("stats", stats);
        });

        result.on("newListener", (event, listener) => {
            if (event === "data") {
                result.resume();
            }
        });

        result.on("removeListener", (event, listener) => {
            if (event === "data") {
                result.pause();
            }
        });

        return stream.pipeline(docsReadable, result) as DocumentResultStream<T>;
    }

    private _getStreamResultTransform<TEntity extends object>(
        session: DocumentSession,
        clazz: ObjectTypeDescriptor<TEntity>,
        fieldsToFetchToken: any) {
        return new stream.Transform({
            objectMode: true,
            transform(chunk: object, encoding: string, callback: stream.TransformCallback) {
                const doc = chunk["value"];
                const metadata = doc[CONSTANTS.Documents.Metadata.KEY];
                const changeVector = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
                // MapReduce indexes return reduce results that don't have @id property
                const id = metadata[CONSTANTS.Documents.Metadata.ID] || null;
                const entity = QueryOperation.deserialize(
                    id, doc, metadata, fieldsToFetchToken || null, true, session, clazz);
                callback(null, {
                    changeVector,
                    metadata,
                    id,
                    document: entity
                } as StreamResult<TEntity>);
            }
        });
    }

    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(query: IDocumentQuery<T>, writable: stream.Writable): Promise<void>;
    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(query: IRawDocumentQuery<T>, writable: stream.Writable): Promise<void>;
    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(
        query: IDocumentQuery<T>, writable: stream.Writable, callback: AbstractCallback<void>): Promise<void>;
    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(
        query: IRawDocumentQuery<T>, writable: stream.Writable, callback: AbstractCallback<void>): Promise<void>;
    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(
        query: IRawDocumentQuery<T> | IDocumentQuery<T>,
        writable: stream.Writable,
        callback?: AbstractCallback<void>): Promise<void> {
        const result = this._streamInto(query, writable);
        passResultToCallback(result, callback);
        return result;
    }

    private async _streamInto<T extends object>(
        query: IRawDocumentQuery<T> | IDocumentQuery<T>,
        writable: stream.Writable): Promise<void> {
        const streamOperation = new StreamOperation(this);
        const command = streamOperation.createRequest(query.getIndexQuery());
        await this.requestExecutor.execute(command, this._sessionInfo);
        return streamResultsIntoStream(command.result.stream, this.conventions, writable);
    }

    public countersFor(documentId: string): ISessionDocumentCounters;
    public countersFor(entity: object): ISessionDocumentCounters;
    public countersFor(entityOrId: string | object): ISessionDocumentCounters {
        return new SessionDocumentCounters(this, entityOrId as any);
    }
}
