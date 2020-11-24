import * as stream from "readable-stream";
import * as os from "os";
import { DocumentQuery } from "./DocumentQuery";
import { MultiLoaderWithInclude } from "./Loaders/MultiLoaderWithInclude";
import { BatchOperation } from "./Operations/BatchOperation";
import {
    ConcurrencyCheckMode,
    IDocumentSession,
    IDocumentSessionImpl,
    LoadOptions,
    SessionLoadInternalParameters,
    SessionLoadStartingWithOptions,
} from "./IDocumentSession";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { ClassConstructor, EntitiesCollectionObject, IRavenObject, ObjectTypeDescriptor } from "../../Types";
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
import { delay } from "../../Utility/PromiseUtil";
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
import { IGraphDocumentQuery } from "./IGraphDocumentQuery";
import { SingleNodeBatchCommand } from "../Commands/Batches/SingleNodeBatchCommand";
import { GraphDocumentQuery } from "./GraphDocumentQuery";
import { AbstractDocumentQuery } from "./AbstractDocumentQuery";
import { ISessionDocumentTimeSeries } from "./ISessionDocumentTimeSeries";
import { ISessionDocumentTypedTimeSeries } from "./ISessionDocumentTypedTimeSeries";
import { ISessionDocumentRollupTypedTimeSeries } from "./ISessionDocumentRollupTypedTimeSeries";
import { JavaScriptMap } from "./JavaScriptMap";
import { SessionDocumentTimeSeries } from "./SessionDocumentTimeSeries";
import { TimeSeriesOperations } from "../TimeSeries/TimeSeriesOperations";
import { SessionDocumentTypedTimeSeries } from "./SessionDocumentTypedTimeSeries";
import { SessionDocumentRollupTypedTimeSeries } from "./SessionDocumentRollupTypedTimeSeries";
import { TIME_SERIES_ROLLUP_SEPARATOR } from "../Operations/TimeSeries/RawTimeSeriesTypes";

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

    public async load<TEntity extends object = IRavenObject>(
        id: string): Promise<TEntity>;
    public async load<TEntity extends object = IRavenObject>(
        id: string,
        options?: LoadOptions<TEntity>): Promise<TEntity>;
    public async load<TEntity extends object = IRavenObject>(
        id: string,
        documentType?: DocumentType<TEntity>): Promise<TEntity>;
    public async load<TEntity extends object = IRavenObject>(
        ids: string[]): Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends object = IRavenObject>(
        ids: string[],
        options?: LoadOptions<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends object = IRavenObject>(
        ids: string[],
        documentType?: DocumentType<TEntity>):
        Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends object = IRavenObject>(
        idOrIds: string | string[],
        optionsOrDocumentType?:
            DocumentType<TEntity> | LoadOptions<TEntity>)
        : Promise<TEntity | EntitiesCollectionObject<TEntity>> {

        const isLoadingSingle = !Array.isArray(idOrIds);
        const ids = !isLoadingSingle ? idOrIds as string[] : [idOrIds as string];

        let options: LoadOptions<TEntity>;
        if (TypeUtil.isDocumentType(optionsOrDocumentType)) {
            options = { documentType: optionsOrDocumentType as DocumentType<TEntity> };
        } else if (TypeUtil.isObject(optionsOrDocumentType)) {
            options = optionsOrDocumentType as LoadOptions<TEntity>;
        }

        const internalOpts = this._prepareLoadInternalOpts(options || {});
        const docs = await this.loadInternal(ids, internalOpts);
        return isLoadingSingle
            ? docs[Object.keys(docs)[0]]
            : docs;
    }

    private _prepareLoadInternalOpts<TEntity extends object>(options: LoadOptions<TEntity>) {
        const internalOpts: SessionLoadInternalParameters<TEntity> = { documentType: options.documentType };
        this.conventions.tryRegisterJsType(internalOpts.documentType);
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

                if (builder.timeSeriesToInclude) {
                    internalOpts.timeSeriesIncludes = [ ...builder.timeSeriesToInclude ];
                }

                if (builder.compareExchangeValuesToInclude) {
                    internalOpts.compareExchangeValueIncludes = [ ...builder.compareExchangeValuesToInclude ];
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

    public async saveChanges(): Promise<void> {
        const saveChangeOperation = new BatchOperation(this);
        let command: SingleNodeBatchCommand;
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
        idPrefix: string): Promise<TEntity[]>;
    public async loadStartingWith<TEntity extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<TEntity>): Promise<TEntity[]>;
    public async loadStartingWith<TEntity extends object>(
        idPrefix: string,
        opts?: SessionLoadStartingWithOptions<TEntity>): Promise<TEntity[]> {

        const loadStartingWithOperation = new LoadStartingWithOperation(this);

        opts ||= {};

        await this._loadStartingWithInternal(idPrefix, loadStartingWithOperation, opts);
        return loadStartingWithOperation.getDocuments<TEntity>(opts.documentType);
    }

    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable): Promise<void>;
    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable,
        opts: SessionLoadStartingWithOptions<TEntity>): Promise<void>;
    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: stream.Writable,
        opts?: SessionLoadStartingWithOptions<TEntity>): Promise<void> {

        if (!writable) {
            throwError("InvalidArgumentException", "writable cannot be null.");
        }
        if (!idPrefix) {
            throwError("InvalidArgumentException", "idPrefix cannot be null.");
        }

        const loadStartingWithOperation = new LoadStartingWithOperation(this);

        opts ||= {};
        await this._loadStartingWithInternal(idPrefix, loadStartingWithOperation, opts, writable);
    }

    public async loadIntoStream(
        ids: string[], writable: stream.Writable): Promise<void> {
        return this._loadInternal(ids, new LoadOperation(this), writable);
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

        loadOperation.withTimeSeries(opts.timeSeriesIncludes);
        loadOperation.withCompareExchange(opts.compareExchangeValueIncludes);

        const command = loadOperation.createRequest();
        if (command) {
            await this._requestExecutor.execute(command, this._sessionInfo);
            loadOperation.setResult(command.result);
        }

        const clazz = this.conventions.getJsTypeByDocumentType(opts.documentType);
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
        entityOrId: TEntity | string, path: string,
        value: UValue): void {

        let id: string;
        if (TypeUtil.isString(entityOrId)) {
            id = entityOrId;
        } else {
            const metadata = this.getMetadataFor(entityOrId as TEntity);
            id = metadata["@id"];
        }

        let patchRequest: PatchRequest;
        patchRequest = new PatchRequest();
        patchRequest.script = "this." + path + " = args.val_" + this._valsCount + ";";
        const valKey = "val_" + this._valsCount;
        patchRequest.values = {};
        patchRequest.values[valKey] = value;

        this._valsCount++;

        if (!this._tryMergePatches(id, patchRequest)) {
            this.defer(new PatchCommandData(id, null, patchRequest, null));
        }
    }

    public patchArray<TEntity extends object, UValue>(
        id: string, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;
    public patchArray<TEntity extends object, UValue>(
        entity: TEntity, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void): void;
    public patchArray<TEntity extends object, UValue>(
        entityOrId: TEntity | string, path: string,
        arrayAdder: (array: JavaScriptArray<UValue>) => void): void {

        let id: string;
        if (TypeUtil.isString(entityOrId)) {
            id = entityOrId;
        } else {
            const metadata = this.getMetadataFor(entityOrId as TEntity);
            id = metadata["@id"];
        }

        let patchRequest: PatchRequest;
        const scriptArray = new JavaScriptArray(this._customCount++, path);
        arrayAdder(scriptArray);

        patchRequest = new PatchRequest();
        patchRequest.script = scriptArray.script;
        patchRequest.values = scriptArray.parameters;

        if (!this._tryMergePatches(id, patchRequest)) {
            this.defer(new PatchCommandData(id, null, patchRequest, null));
        }
    }

    patchObject<TEntity extends object, TKey, TValue>(
        entity: TEntity, pathToObject: string, mapAdder: (map: JavaScriptMap<TKey, TValue>) => void): void;
    patchObject<TEntity extends object, TKey, TValue>(
        id: string, pathToObject: string, mapAdder: (map: JavaScriptMap<TKey, TValue>) => void): void;
    patchObject<TEntity extends object, TKey, TValue>(
        idOrEntity: string | TEntity, pathToObject: string, mapAdder: (map: JavaScriptMap<TKey, TValue>) => void): void {
        if (TypeUtil.isString(idOrEntity)) {
            const scriptMap = new JavaScriptMap(this._customCount++, pathToObject);

            mapAdder(scriptMap);

            const patchRequest = new PatchRequest();
            patchRequest.script = scriptMap.getScript();
            patchRequest.values = scriptMap.parameters;

            if (!this._tryMergePatches(idOrEntity, patchRequest)) {
                this.defer(new PatchCommandData(idOrEntity, null, patchRequest, null));
            }
        } else {
            const metadata = this.getMetadataFor(idOrEntity);
            const id = metadata[CONSTANTS.Documents.Metadata.ID];
            this.patchObject(id, pathToObject, mapAdder);
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
            this.conventions.tryRegisterJsType(documentType);
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

            const { index, ...restOpts } = opts;
            if (index) {
                opts = {
                    ...restOpts,
                    indexName: new opts.index().getIndexName()
                }
            }
        }

        if (opts.documentType) {
            this.conventions.tryRegisterJsType(opts.documentType);
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
            const entityType = this.conventions.getJsTypeByDocumentType(opts.documentType);
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

    protected _hasClusterSession(): boolean {
        return !!this._clusterTransaction;
    }

    protected _clearClusterSession(): void {
        if (!this._hasClusterSession()) {
            return;
        }

        this.clusterSession.clear();
    }

    public get clusterSession(): ClusterTransactionOperationsBase {
        if (!this._clusterTransaction) {
            this._clusterTransaction = new ClusterTransactionOperations(this);
        }
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
            while (await this._executeLazyOperationsSingleStep(responseTimeDuration, requests, sw)) {
                await delay(100);
            }

            responseTimeDuration.computeServerTotal();
            sw.stop();
            responseTimeDuration.totalClientDuration = sw.elapsed;
            return responseTimeDuration;
        } finally {
            this._pendingLazyOperations.length = 0;
        }
    }

    private async _executeLazyOperationsSingleStep(
        responseTimeInformation: ResponseTimeInformation, requests: GetRequest[], sw: Stopwatch): Promise<boolean> {
        const multiGetOperation = new MultiGetOperation(this);
        const multiGetCommand = multiGetOperation.createRequest(requests);
        await this.requestExecutor.execute(multiGetCommand, this._sessionInfo);
        const responses: GetResponse[] = multiGetCommand.result;

        for (let i = 0; i < this._pendingLazyOperations.length; i++) {
            let totalTime: number;
            let tempReqTime: string;
            const response = responses[i];
            tempReqTime = response.headers[HEADERS.REQUEST_TIME];
            response.elapsed = sw.elapsed;
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
            queryOrIdPrefix as unknown as (AbstractDocumentQuery<T, any>),
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
            clazz = this.conventions.getJsTypeByDocumentType(opts.documentType);
        }

        const result = this._getStreamResultTransform(this, clazz, null, false);

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
        query: AbstractDocumentQuery<T, any>,
        streamQueryStatsCallback?: StreamQueryStatisticsCallback)
        : Promise<DocumentResultStream<T>> {
        const streamOperation = new StreamOperation(this);
        const command = streamOperation.createRequest(query.getIndexQuery());

        await this.requestExecutor.execute(command, this.sessionInfo);
        const docsReadable = streamOperation.setResult(command.result);

        const result = this._getStreamResultTransform(
            this, (query as any).getQueryType(), (query as any).fieldsToFetchToken, query.isProjectInto);

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
        fieldsToFetchToken: any,
        isProjectInto: boolean) {
        return new stream.Transform({
            objectMode: true,
            transform(chunk: object, encoding: string, callback: stream.TransformCallback) {
                const doc = chunk["value"];
                const metadata = doc[CONSTANTS.Documents.Metadata.KEY];
                const changeVector = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
                // MapReduce indexes return reduce results that don't have @id property
                const id = metadata[CONSTANTS.Documents.Metadata.ID] || null;
                //TODO: pass timeseries fields!
                const entity = QueryOperation.deserialize(
                    id, doc, metadata, fieldsToFetchToken || null, true, session, clazz, isProjectInto);
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

    public graphQuery<TEntity extends object>(
        query: string, documentType?: DocumentType<TEntity>): IGraphDocumentQuery<TEntity> {
        return new GraphDocumentQuery<TEntity>(this, query, documentType);
    }

    public timeSeriesFor(documentId: string, name: string): ISessionDocumentTimeSeries;
    public timeSeriesFor(entity:any, name: string): ISessionDocumentTimeSeries;
    public timeSeriesFor<T extends object>(documentId: string, clazz: ClassConstructor<T>): ISessionDocumentTypedTimeSeries<T>;
    public timeSeriesFor<T extends object>(documentId: string, name: string, clazz: ClassConstructor<T>): ISessionDocumentTypedTimeSeries<T>;
    public timeSeriesFor<T extends object>(entity: object, clazz: ClassConstructor<T>): ISessionDocumentTypedTimeSeries<T>;
    public timeSeriesFor<T extends object>(entity: object, name: string, clazz: ClassConstructor<T>): ISessionDocumentTypedTimeSeries<T>;
    public timeSeriesFor<T extends object>(entityOrDocumentId: string | object, nameOrClass: string | ClassConstructor<T>, clazz?: ClassConstructor<T>): ISessionDocumentTypedTimeSeries<T> | ISessionDocumentTimeSeries {
        if (clazz) {
            const name = nameOrClass as string;
            const tsName = name ?? TimeSeriesOperations.getTimeSeriesName(clazz, this.conventions);
            return new SessionDocumentTypedTimeSeries(this, entityOrDocumentId, tsName, clazz);
        }

        if (TypeUtil.isString(nameOrClass)) {
            return new SessionDocumentTimeSeries(this, entityOrDocumentId, nameOrClass);
        } else {
            const tsName = TimeSeriesOperations.getTimeSeriesName(nameOrClass, this.conventions);
            return new SessionDocumentTypedTimeSeries(this, entityOrDocumentId, tsName, nameOrClass);
        }
    }

    timeSeriesRollupFor<T extends object>(entity: object, policy: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(entity: object, policy: string, raw: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(documentId: string, policy: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(documentId: string, policy: string, raw: string, clazz: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T>;
    timeSeriesRollupFor<T extends object>(entityOrDocumentId: string | object, policy: string, rawOrClass: string | ClassConstructor<T>, clazz?: ClassConstructor<T>): ISessionDocumentRollupTypedTimeSeries<T> {
        if (clazz) {
            const name = rawOrClass as string;
            const tsName = name ?? TimeSeriesOperations.getTimeSeriesName(clazz, this.conventions);
            return new SessionDocumentRollupTypedTimeSeries(this, entityOrDocumentId, tsName + TIME_SERIES_ROLLUP_SEPARATOR + policy, clazz);
        }

        const tsName = TimeSeriesOperations.getTimeSeriesName(rawOrClass as ClassConstructor<T>, this.conventions);
        return new SessionDocumentRollupTypedTimeSeries(this, entityOrDocumentId, tsName + TIME_SERIES_ROLLUP_SEPARATOR + policy, rawOrClass as ClassConstructor<T>);
    }
}
