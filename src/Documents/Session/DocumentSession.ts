import { pipeline, Writable, Transform, TransformCallback } from "node:stream";
import { DocumentQuery } from "./DocumentQuery.js";
import { MultiLoaderWithInclude } from "./Loaders/MultiLoaderWithInclude.js";
import { BatchOperation } from "./Operations/BatchOperation.js";
import {
    ConcurrencyCheckMode,
    IDocumentSession,
    IDocumentSessionImpl,
    LoadOptions,
    SessionLoadInternalParameters,
    SessionLoadStartingWithOptions,
} from "./IDocumentSession.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { ClassConstructor, EntitiesCollectionObject, IRavenObject, ObjectTypeDescriptor } from "../../Types/index.js";
import { throwError } from "../../Exceptions/index.js";
import { DocumentType } from "../DocumentAbstractions.js";
import { LoadOperation } from "./Operations/LoadOperation.js";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations.js";
import { DocumentStore } from "../DocumentStore.js";
import { GetDocumentsCommand } from "../Commands/GetDocumentsCommand.js";
import { HeadDocumentCommand } from "../Commands/HeadDocumentCommand.js";
import { LoadStartingWithOperation } from "./Operations/LoadStartingWithOperation.js";
import { ILoaderWithInclude } from "./Loaders/ILoaderWithInclude.js";
import { IRawDocumentQuery } from "./IRawDocumentQuery.js";
import { RawDocumentQuery } from "./RawDocumentQuery.js";
import { AdvancedDocumentQueryOptions, DocumentQueryOptions } from "./QueryOptions.js";
import { IDocumentQuery } from "./IDocumentQuery.js";
import { IAttachmentsSessionOperations } from "./IAttachmentsSessionOperations.js";
import { DocumentSessionAttachments } from "./DocumentSessionAttachments.js";
import { IEagerSessionOperations } from "./Operations/Lazy/IEagerSessionOperations.js";
import { Lazy } from "../Lazy.js";
import { LazyLoadOperation } from "./Operations/Lazy/LazyLoadOperation.js";
import { ILazyOperation } from "./Operations/Lazy/ILazyOperation.js";
import { ResponseTimeInformation } from "./ResponseTimeInformation.js";
import { GetRequest } from "../Commands/MultiGet/GetRequest.js";
import { MultiGetOperation } from "./Operations/MultiGetOperation.js";
import { Stopwatch } from "../../Utility/Stopwatch.js";
import { GetResponse } from "../Commands/MultiGet/GetResponse.js";
import { CONSTANTS, HEADERS } from "../../Constants.js";
import { delay } from "../../Utility/PromiseUtil.js";
import { ILazySessionOperations } from "./Operations/Lazy/ILazySessionOperations.js";
import { LazySessionOperations } from "./Operations/Lazy/LazySessionOperations.js";
import { JavaScriptArray } from "./JavaScriptArray.js";
import { PatchRequest } from "../Operations/PatchRequest.js";
import { PatchCommandData } from "../Commands/Batches/PatchCommandData.js";
import { JsonPatchCommandData } from "../Commands/Batches/JsonPatchCommandData.js";
import { JsonPatchDocument } from "../Operations/JsonPatchDocument.js";
import { canUseJsonPatchValue, escapeJsonPointerSegment, isValidJsonPointerSegment, tryBuildJsonPointer } from "./JsonPatchPath.js";
import { IdTypeAndName } from "../IdTypeAndName.js";
import { IRevisionsSessionOperations } from "./IRevisionsSessionOperations.js";
import { DocumentSessionRevisions } from "./DocumentSessionRevisions.js";
import { stringToReadable, pipelineAsync } from "../../Utility/StreamUtil.js";
import { StreamResult } from "../Commands/StreamResult.js";
import { DocumentResultStream } from "./DocumentResultStream.js";
import { StreamOperation } from "./Operations/StreamOperation.js";
import { QueryOperation } from "./Operations/QueryOperation.js";
import { IAdvancedSessionOperations, StreamQueryStatisticsCallback } from "./IAdvancedSessionOperations.js";
import { streamResultsIntoStream } from "../../Mapping/Json/Streams/Pipelines.js";
import { IClusterTransactionOperations } from "./IClusterTransactionOperations.js";
import { ClusterTransactionOperations } from "./ClusterTransactionOperations.js";
import { ClusterTransactionOperationsBase } from "./ClusterTransactionOperationsBase.js";
import { SessionOptions } from "./SessionOptions.js";
import { ISessionDocumentCounters } from "./ISessionDocumentCounters.js";
import { SessionDocumentCounters } from "./SessionDocumentCounters.js";
import { IncludeBuilder } from "./Loaders/IncludeBuilder.js";
import { SingleNodeBatchCommand } from "../Commands/Batches/SingleNodeBatchCommand.js";
import { AbstractDocumentQuery } from "./AbstractDocumentQuery.js";
import { ISessionDocumentTimeSeries } from "./ISessionDocumentTimeSeries.js";
import { ISessionDocumentTypedTimeSeries } from "./ISessionDocumentTypedTimeSeries.js";
import { ISessionDocumentRollupTypedTimeSeries } from "./ISessionDocumentRollupTypedTimeSeries.js";
import { JavaScriptMap } from "./JavaScriptMap.js";
import { SessionDocumentTimeSeries } from "./SessionDocumentTimeSeries.js";
import { TimeSeriesOperations } from "../TimeSeries/TimeSeriesOperations.js";
import { SessionDocumentTypedTimeSeries } from "./SessionDocumentTypedTimeSeries.js";
import { SessionDocumentRollupTypedTimeSeries } from "./SessionDocumentRollupTypedTimeSeries.js";
import { TIME_SERIES_ROLLUP_SEPARATOR } from "../Operations/TimeSeries/RawTimeSeriesTypes.js";
import { AbstractCommonApiForIndexes } from "../Indexes/AbstractCommonApiForIndexes.js";
import { DocumentInfo } from "./DocumentInfo.js";
import { MetadataDictionary } from "../../Mapping/MetadataAsDictionary.js";
import { ConditionalLoadResult } from "./ConditionalLoadResult.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { ConditionalGetDocumentsCommand } from "../Commands/ConditionalGetDocumentsCommand.js";
import { StatusCodes } from "../../Http/StatusCode.js";
import { ISessionDocumentIncrementalTimeSeries } from "./ISessionDocumentIncrementalTimeSeries.js";
import { ISessionDocumentTypedIncrementalTimeSeries } from "./ISessionDocumentTypedIncrementalTimeSeries.js";
import { EOL } from "../../Utility/OsUtil.js";

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

    public get advanced(): IAdvancedSessionOperations {
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
        id: string): Promise<TEntity | null>;
    public async load<TEntity extends object = IRavenObject>(
        id: string,
        options?: LoadOptions<TEntity>): Promise<TEntity | null>;
    public async load<TEntity extends object = IRavenObject>(
        id: string,
        documentType?: DocumentType<TEntity>): Promise<TEntity | null>;
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
        : Promise<TEntity | null | EntitiesCollectionObject<TEntity>> {

        const isLoadingSingle = !Array.isArray(idOrIds);
        if (isLoadingSingle && StringUtil.isNullOrWhitespace(idOrIds as string)) {
            return null;
        }
        const ids = isLoadingSingle ? [idOrIds as string] : idOrIds as string[];

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

                internalOpts.revisionIncludesByChangeVector = builder.revisionsToIncludeByChangeVector ? Array.from(builder.revisionsToIncludeByChangeVector) : null;
                internalOpts.revisionsToIncludeByDateTime = builder.revisionsToIncludeByDateTime;

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
        writable: Writable): Promise<void>;
    private async _loadInternal(
        ids: string[],
        operation: LoadOperation, writable?: Writable)
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
                const readable = stringToReadable(JSON.stringify(command.result));
                await pipelineAsync(readable, writable);
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
    public async refresh<TEntity extends object>(entity: TEntity): Promise<void>;
    public async refresh<TEntity extends object>(entities: TEntity[]): Promise<void>;
    public async refresh<TEntity extends object>(entityOrEntities: TEntity[] | TEntity): Promise<void> {
        if (TypeUtil.isArray(entityOrEntities)) {
            return this._refreshEntitiesInternal(entityOrEntities);
        } else {
            return this._refreshEntityInternal(entityOrEntities);
        }
    }

    private async _refreshEntityInternal<TEntity extends object>(entity: TEntity): Promise<void> {
        const documentInfo = this.documentsByEntity.get(entity);
        if (!documentInfo) {
            DocumentSession._throwCouldNotRefreshDocument("Cannot refresh a transient instance");
        }

        this.incrementRequestCount();

        const command = new GetDocumentsCommand({
            id: documentInfo.id,
            conventions: this.conventions
        });

        await this._requestExecutor.execute(command, this._sessionInfo);
        const commandResult = command.result.results[0];
        this._refreshInternal(entity, commandResult, documentInfo);
    }

    private async _refreshEntitiesInternal<TEntity extends object>(entities: TEntity[]): Promise<void> {
        const idsEntitiesPairs = this._buildEntityDocInfoByIdHolder(entities);

        this.incrementRequestCount();

        const command = new GetDocumentsCommand({
            ids: Array.from(idsEntitiesPairs.keys()),
            includes: null,
            metadataOnly: false,
            conventions: this.conventions
        });
        await this._requestExecutor.execute(command, this.sessionInfo);

        this._refreshEntities(command, idsEntitiesPairs);
    }


    /**
     * Check if document exists without loading it
     */
    public async exists(id: string): Promise<boolean> {
        if (!id) {
            throwError("InvalidArgumentException", "id cannot be null");
        }

        if (this._knownMissingIds.has(id)) {
            return false;
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
        writable: Writable): Promise<void>;
    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: Writable,
        opts: SessionLoadStartingWithOptions<TEntity>): Promise<void>;
    public async loadStartingWithIntoStream<TEntity extends object>(
        idPrefix: string,
        writable: Writable,
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
        ids: string[], writable: Writable): Promise<void> {
        return this._loadInternal(ids, new LoadOperation(this), writable);
    }

    private async _loadStartingWithInternal<TEntity extends object>(
        idPrefix: string,
        operation: LoadStartingWithOperation,
        opts: SessionLoadStartingWithOptions<TEntity>,
        writable?: Writable): Promise<GetDocumentsCommand> {
        const { matches, start, pageSize, exclude, startAfter } =
        opts || {} as SessionLoadStartingWithOptions<TEntity>;
        operation.withStartWith(idPrefix, {
            matches, start, pageSize, exclude, startAfter
        });

        const command = operation.createRequest();
        if (command) {
            await this._requestExecutor.execute(command, this._sessionInfo);
            if (writable) {
                return pipelineAsync(
                    stringToReadable(JSON.stringify(command.result)),
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

        loadOperation.withRevisions(opts.revisionIncludesByChangeVector);
        loadOperation.withRevisions(opts.revisionsToIncludeByDateTime);
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

    public addOrIncrement<T extends object, UValue>(id: string, entity: T, pathToObject: string, valToAdd: UValue) {
        const variable = "this." + pathToObject;
        const value = "args.val_" + this._valsCount;

        const patchRequest = new PatchRequest();
        patchRequest.script = variable + " = " + variable + " ? " + variable + " + " + value + " : " + value;
        patchRequest.values = {
            ["val_" + this._valsCount]: valToAdd
        };

        const collectionName = this._requestExecutor.conventions.getCollectionNameForEntity(entity);

        const metadataAsDictionary = MetadataDictionary.create();
        metadataAsDictionary[CONSTANTS.Documents.Metadata.COLLECTION] = collectionName;

        const descriptor = this._requestExecutor.conventions.getTypeDescriptorByEntity(entity);
        const jsType = this._requestExecutor.conventions.getJsTypeName(descriptor);
        if (jsType) {
            metadataAsDictionary[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = jsType;
        }

        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.collection = collectionName;
        documentInfo.metadataInstance = metadataAsDictionary;


        const newInstance = this.entityToJson.convertEntityToJson(entity, documentInfo);
        this._valsCount++;

        const patchCommandData = new PatchCommandData(id, null, patchRequest);
        patchCommandData.createIfMissing = newInstance;
        this.defer(patchCommandData);
    }

    public addOrPatchArray<T extends object, UValue>(id: string, entity: T, pathToArray: string, arrayAdder: (array: JavaScriptArray<UValue>) => void) {
        const scriptArray = new JavaScriptArray<UValue>(this._customCount++, pathToArray);

        arrayAdder(scriptArray);

        const patchRequest = new PatchRequest();
        patchRequest.script = scriptArray.script;
        patchRequest.values = scriptArray.parameters;

        const collectionName = this._requestExecutor.conventions.getCollectionNameForEntity(entity);

        const metadataAsDictionary = MetadataDictionary.create();
        metadataAsDictionary[CONSTANTS.Documents.Metadata.COLLECTION] = collectionName;

        const descriptor = this._requestExecutor.conventions.getTypeDescriptorByEntity(entity);
        const jsType = this._requestExecutor.conventions.getJsTypeName(descriptor);
        if (jsType) {
            metadataAsDictionary[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = jsType;
        }

        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.collection = collectionName;
        documentInfo.metadataInstance = metadataAsDictionary;

        const newInstance = this.entityToJson.convertEntityToJson(entity, documentInfo);

        this._valsCount++;

        const patchCommandData = new PatchCommandData(id, null, patchRequest);
        patchCommandData.createIfMissing = newInstance;
        this.defer(patchCommandData);
    }

    public addOrPatch<T extends object, UValue>(id: string, entity: T, pathToObject: string, value: UValue) {
        const patchRequest = new PatchRequest();
        patchRequest.script = "this." + pathToObject + " = args.val_" + this._valsCount;
        patchRequest.values = {
            ["val_" + this._valsCount]: value
        };

        const collectionName = this._requestExecutor.conventions.getCollectionNameForEntity(entity);

        const metadataAsDictionary = MetadataDictionary.create();
        metadataAsDictionary[CONSTANTS.Documents.Metadata.COLLECTION] = collectionName;

        const descriptor = this._requestExecutor.conventions.getTypeDescriptorByEntity(entity);
        const jsType = this._requestExecutor.conventions.getJsTypeName(descriptor);
        if (jsType) {
            metadataAsDictionary[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = jsType;
        }

        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.collection = collectionName;
        documentInfo.metadataInstance = metadataAsDictionary;


        const newInstance = this.entityToJson.convertEntityToJson(entity, documentInfo);
        this._valsCount++;

        const patchCommandData = new PatchCommandData(id, null, patchRequest);
        patchCommandData.createIfMissing = newInstance;
        this.defer(patchCommandData);
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

        if (this._tryPatchWithJsonPatch(id, path, value)) {
            return;
        }

        const patchRequest = new PatchRequest();
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

        const scriptArray = new JavaScriptArray<UValue>(this._customCount++, path);
        arrayAdder(scriptArray);

        if (this._tryPatchArrayWithJsonPatch(id, path, scriptArray)) {
            return;
        }

        const patchRequest = new PatchRequest();
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
            const scriptMap = new JavaScriptMap<TKey, TValue>(this._customCount++, pathToObject);

            mapAdder(scriptMap);

            if (this._tryPatchObjectWithJsonPatch(idOrEntity, pathToObject, scriptMap)) {
                return;
            }

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

    private get _useJsonPatchInSessionPatchMethods(): boolean {
        return this.conventions.sessionPatchBehavior === "JsonPatch";
    }

    /**
     * A JavaScript patch already deferred for this document has to run first; later operations join it
     * (see _tryMergePatches) instead of being reordered into a separate JsonPatch command.
     */
    private _hasDeferredJavaScriptPatch(id: string): boolean {
        return this.deferredCommandsMap.has(IdTypeAndName.keyFor(id, "PATCH", null));
    }

    /**
     * Defers the JsonPatch, or appends its operations to the JsonPatch already deferred for the same
     * document so one document gets one JsonPatch command per saveChanges().
     */
    private _deferJsonPatch(id: string, patch: JsonPatchDocument): void {
        const existing = this.deferredCommandsMap.get(IdTypeAndName.keyFor(id, "JsonPatch", null)) as JsonPatchCommandData | undefined;
        if (!existing) {
            this.defer(new JsonPatchCommandData(id, patch));
            return;
        }

        const commandIdx = this._deferredCommands.indexOf(existing);
        if (commandIdx > -1) {
            this._deferredCommands.splice(commandIdx, 1);
        }

        existing.jsonPatch.operations.push(...patch.operations);
        this.defer(existing);
    }

    private _tryPatchWithJsonPatch(id: string, path: string, value: unknown): boolean {
        if (!this._useJsonPatchInSessionPatchMethods
            || this._hasDeferredJavaScriptPatch(id)
            || !canUseJsonPatchValue(value)) {
            return false;
        }

        const pointer = tryBuildJsonPointer(path);
        if (!pointer) {
            return false;
        }

        // Match the JavaScript "this.x = value" semantics: assigning to a named member creates it when
        // absent (JsonPatch "add" creates-or-replaces an object member), while assigning to an existing
        // positional element overwrites it in place (JsonPatch "replace"; "add" would insert before the index).
        const patch = new JsonPatchDocument();
        if (pointer.endsWithIndex) {
            patch.replace(pointer.pointer, value);
        } else {
            patch.add(pointer.pointer, value);
        }

        this._deferJsonPatch(id, patch);
        return true;
    }

    private _tryPatchArrayWithJsonPatch<UValue>(id: string, path: string, scriptArray: JavaScriptArray<UValue>): boolean {
        if (!this._useJsonPatchInSessionPatchMethods || this._hasDeferredJavaScriptPatch(id)) {
            return false;
        }

        const pointer = tryBuildJsonPointer(path);
        if (!pointer) {
            return false;
        }

        const patch = new JsonPatchDocument();
        for (const operation of scriptArray.operations) {
            switch (operation.type) {
                case "push": {
                    for (const value of operation.values) {
                        if (!canUseJsonPatchValue(value)) {
                            return false;
                        }
                        patch.add(`${pointer.pointer}/-`, value);
                    }
                    break;
                }
                case "removeAt": {
                    if (!Number.isInteger(operation.index) || operation.index < 0) {
                        return false;
                    }
                    patch.remove(`${pointer.pointer}/${operation.index}`);
                    break;
                }
                default: {
                    return false;
                }
            }
        }

        if (patch.operations.length === 0) {
            return false;
        }

        this._deferJsonPatch(id, patch);
        return true;
    }

    private _tryPatchObjectWithJsonPatch<TKey, TValue>(id: string, path: string, scriptMap: JavaScriptMap<TKey, TValue>): boolean {
        if (!this._useJsonPatchInSessionPatchMethods || this._hasDeferredJavaScriptPatch(id)) {
            return false;
        }

        const pointer = tryBuildJsonPointer(path);
        if (!pointer) {
            return false;
        }

        const patch = new JsonPatchDocument();
        for (const operation of scriptMap.operations) {
            const key = operation.key == null ? null : String(operation.key);
            if (!isValidJsonPointerSegment(key)) {
                return false;
            }

            const keyPointer = `${pointer.pointer}/${escapeJsonPointerSegment(key)}`;
            switch (operation.type) {
                case "set": {
                    if (!canUseJsonPatchValue(operation.value)) {
                        return false;
                    }
                    patch.add(keyPointer, operation.value);
                    break;
                }
                case "remove": {
                    patch.remove(keyPointer);
                    break;
                }
                default: {
                    return false;
                }
            }
        }

        if (patch.operations.length === 0) {
            return false;
        }

        this._deferJsonPatch(id, patch);
        return true;
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

        for (const key of Object.keys(oldPatch.patch.values)) {
            newVals[key] = oldPatch.patch.values[key];
        }

        for (const key of Object.keys(patchRequest.values)) {
            newVals[key] = patchRequest.values[key];
        }

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
    public query<TEntity extends object>(documentType: DocumentType<TEntity>, index: new () => AbstractCommonApiForIndexes): IDocumentQuery<TEntity>;
    public query<TEntity extends object>(opts: DocumentQueryOptions<TEntity>): IDocumentQuery<TEntity>;
    public query<TEntity extends object>(
        docTypeOrOpts: DocumentType<TEntity> | DocumentQueryOptions<TEntity>, index?: new () => AbstractCommonApiForIndexes): IDocumentQuery<TEntity> {
        if (TypeUtil.isDocumentType(docTypeOrOpts)) {
            return this.documentQuery({
                documentType: docTypeOrOpts as DocumentType<TEntity>,
                index
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
        let { collection } = opts;
        const { indexName } = opts;
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
        try {
            await this.requestExecutor.execute(multiGetCommand, this._sessionInfo);
            const responses: GetResponse[] = multiGetCommand.result;

            if (!multiGetCommand.aggressivelyCached) {
                this.incrementRequestCount();
            }

            for (let i = 0; i < this._pendingLazyOperations.length; i++) {
                const response = responses[i];
                const tempReqTime = response.headers[HEADERS.REQUEST_TIME];
                response.elapsed = sw.elapsed;
                const totalTime = tempReqTime ? Number.parseInt(tempReqTime, 10) : 0;
                const timeItem = {
                    url: requests[i].urlAndQuery,
                    duration: totalTime
                };

                responseTimeInformation.durationBreakdown.push(timeItem);
                if (response.requestHasErrors()) {
                    throwError(
                        "InvalidOperationException",
                        "Got an error from server, status code: " + response.statusCode + EOL + response.result);
                }

                await this._pendingLazyOperations[i].handleResponseAsync(response);
                if (this._pendingLazyOperations[i].requiresRetry) {
                    return true;
                }
            }
        } finally {
            multiGetCommand.dispose();
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

        const lazyOp = new LazyLoadOperation<TResult>(this, loadOperation, clazz)
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

        return pipeline(docsReadable, result, TypeUtil.NOOP) as unknown as DocumentResultStream<T>;
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

        return pipeline(docsReadable, result, TypeUtil.NOOP) as unknown as DocumentResultStream<T>;
    }

    private _getStreamResultTransform<TEntity extends object>(
        session: DocumentSession,
        clazz: ObjectTypeDescriptor<TEntity>,
        fieldsToFetchToken: any,
        isProjectInto: boolean) {
        return new Transform({
            objectMode: true,
            transform(chunk: object, encoding: string, callback: TransformCallback) {
                const doc = chunk["value"];
                const metadata = doc[CONSTANTS.Documents.Metadata.KEY];
                let changeVector: string = null;
                // MapReduce indexes return reduce results that don't have @id property
                const id = metadata[CONSTANTS.Documents.Metadata.ID] || null;
                //TODO: pass timeseries fields!
                const entity = QueryOperation.deserialize(
                    id, doc, metadata, fieldsToFetchToken || null, true, session, clazz, isProjectInto);
                if (id) {
                    changeVector = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
                }
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
    public async streamInto<T extends object>(query: IDocumentQuery<T>, writable: Writable): Promise<void>;
    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(query: IRawDocumentQuery<T>, writable: Writable): Promise<void>;
    /**
     *  Returns the results of a query directly into stream
     */
    public async streamInto<T extends object>(
        query: IRawDocumentQuery<T> | IDocumentQuery<T>,
        writable: Writable): Promise<void> {
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
            InMemoryDocumentSessionOperations.validateTimeSeriesName(tsName);
            return new SessionDocumentTypedTimeSeries(this, entityOrDocumentId, tsName, clazz);
        }

        if (TypeUtil.isString(nameOrClass)) {
            return new SessionDocumentTimeSeries(this, entityOrDocumentId, nameOrClass);
        } else {
            const tsName = TimeSeriesOperations.getTimeSeriesName(nameOrClass, this.conventions);
            InMemoryDocumentSessionOperations.validateTimeSeriesName(tsName);
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

    public incrementalTimeSeriesFor(documentId: string, name: string): ISessionDocumentIncrementalTimeSeries;
    public incrementalTimeSeriesFor(entity: object, name: string): ISessionDocumentIncrementalTimeSeries;
    public incrementalTimeSeriesFor<T extends object>(documentId: string, clazz: ClassConstructor<T>): ISessionDocumentTypedIncrementalTimeSeries<T>;
    public incrementalTimeSeriesFor<T extends object>(documentId: string, name: string, clazz: ClassConstructor<T>): ISessionDocumentTypedIncrementalTimeSeries<T>;
    public incrementalTimeSeriesFor<T extends object>(entity: object, clazz: ClassConstructor<T>): ISessionDocumentTypedIncrementalTimeSeries<T>;
    public incrementalTimeSeriesFor<T extends object>(entity: object, name: string, clazz: ClassConstructor<T>): ISessionDocumentTypedIncrementalTimeSeries<T>;
    public incrementalTimeSeriesFor<T extends object>(entityOrDocumentId: string | object,
                                                      nameOrClass: string | ClassConstructor<T>,
                                                      clazz?: ClassConstructor<T>
    ): ISessionDocumentTypedIncrementalTimeSeries<T> | ISessionDocumentIncrementalTimeSeries {
        if (clazz) {
            const name = nameOrClass as string;
            const tsName = name ?? TimeSeriesOperations.getTimeSeriesName(clazz, this.conventions);
            InMemoryDocumentSessionOperations.validateIncrementalTimeSeriesName(tsName);
            return new SessionDocumentTypedTimeSeries(this, entityOrDocumentId, tsName, clazz);
        }

        if (TypeUtil.isString(nameOrClass)) {
            InMemoryDocumentSessionOperations.validateIncrementalTimeSeriesName(nameOrClass);
            return new SessionDocumentTimeSeries(this, entityOrDocumentId, nameOrClass);
        } else {
            const tsName = TimeSeriesOperations.getTimeSeriesName(nameOrClass, this.conventions);
            InMemoryDocumentSessionOperations.validateIncrementalTimeSeriesName(tsName);
            return new SessionDocumentTypedTimeSeries(this, entityOrDocumentId, tsName, nameOrClass);
        }
    }

    async conditionalLoad<T extends object>(id: string, changeVector: string, clazz: ClassConstructor<T>): Promise<ConditionalLoadResult<T>> {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        if (this.advanced.isLoaded(id)) {
            const entity = await this.load(id, clazz);
            if (!entity) {
                return {
                    entity: null,
                    changeVector: null
                }
            }

            const cv = this.advanced.getChangeVectorFor(entity);
            return {
                entity,
                changeVector: cv
            };
        }

        if (StringUtil.isNullOrEmpty(changeVector)) {
            throwError("InvalidArgumentException", "The requested document with id '" + id + "' is not loaded into the session and could not conditional load when changeVector is null or empty.");
        }

        this.incrementRequestCount();

        const cmd = new ConditionalGetDocumentsCommand(id, changeVector, this.conventions);
        await this.advanced.requestExecutor.execute(cmd);

        switch (cmd.statusCode) {
            case StatusCodes.NotModified: {
                return {
                    entity: null, // value not changed
                    changeVector
                }
            }
            case StatusCodes.NotFound: {
                this.registerMissing(id);
                return {
                    entity: null,
                    changeVector: null // value is missing
                }
            }
        }

        const documentInfo = DocumentInfo.getNewDocumentInfo(cmd.result.results[0]);
        const r = this.trackEntity(clazz, documentInfo);
        return {
            entity: r,
            changeVector: cmd.result.changeVector
        };
    }
}
