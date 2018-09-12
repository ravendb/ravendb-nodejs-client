import * as os from "os";
import {DocumentQuery} from "./DocumentQuery";
import {MultiLoaderWithInclude} from "./Loaders/MultiLoaderWithInclude";
import {BatchOperation} from "./Operations/BatchOperation";
import * as BluebirdPromise from "bluebird";
import { 
    IDocumentSession, 
    LoadOptions, 
    ConcurrencyCheckMode, 
    SessionLoadStartingWithOptions, 
    IDocumentSessionImpl,
} from "./IDocumentSession";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { AbstractCallback } from "../../Types/Callbacks";
import { TypeUtil } from "../../Utility/TypeUtil";
import { IRavenObject, EntitiesCollectionObject, ObjectTypeDescriptor} from "../../Types";
import { getError, throwError } from "../../Exceptions";
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
import { HEADERS } from "../../Constants";
import { ResponseTimeItem } from "../Session/ResponseTimeInformation";
import { delay } from "../../Utility/PromiseUtil";
import { ILazySessionOperations } from "./Operations/Lazy/ILazySessionOperations";
import { LazySessionOperations } from "./Operations/Lazy/LazySessionOperations";

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

    public constructor(dbName: string, documentStore: DocumentStore, id: string, requestExecutor: RequestExecutor) {
        super(dbName, documentStore, requestExecutor, id);
        this._attachments = new DocumentSessionAttachments(this);
        // TBD Revisions = new DocumentSessionRevisions(this);
    }

    public get advanced() {
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
        const ids = !isLoadingSingle ? idOrIds as string[] : [ idOrIds as string ];

        let options: LoadOptions<TEntity>;
        if (TypeUtil.isDocumentType(optionsOrCallback)) { 
            options = { documentType: optionsOrCallback as DocumentType<TEntity> };
        } else if (TypeUtil.isFunction(optionsOrCallback)) {
            callback = optionsOrCallback as AbstractCallback<TEntity> || TypeUtil.NOOP;
        } else if (TypeUtil.isObject(optionsOrCallback)) {
            options = optionsOrCallback as LoadOptions<TEntity>;
        } 

        callback = callback || TypeUtil.NOOP;
        options = options || {};

        this.conventions.tryRegisterEntityType(options.documentType); 
        const objType = this.conventions.findEntityType(options.documentType);

        const loadOperation = new LoadOperation(this);
        const result = BluebirdPromise.resolve(this._loadInternal<TEntity>(ids, loadOperation))
            .then(() => loadOperation.getDocuments<TEntity>(objType))
            .then((docs: EntitiesCollectionObject<TEntity> | TEntity) => {
                if (isLoadingSingle) {
                    return docs[Object.keys(docs)[0]];
                }

                return docs;
            })
            .tap((entities: TEntity | EntitiesCollectionObject<TEntity>) => callback(null, entities))
            .tapCatch(err => callback(err));

        return Promise.resolve(result);
    }

    private _loadInternal<T>(ids: string[], operation: LoadOperation): Promise<void> { 
        // TBD optional stream parameter
        
        operation.byIds(ids);

        const command = operation.createRequest();
        return Promise.resolve()
            .then(() => {
                if (command) {
                    return this._requestExecutor.execute(command, this._sessionInfo)
                        .then(() => operation.setResult(command.result)); // TBD: delete me after impl stream
                    /* TBD
                     if(stream!=null)
                            Context.Write(stream, command.Result.Results.Parent);
                        else
                            operation.SetResult(command.Result);
                     */
                }
            });
    }

    public saveChanges(): Promise<void>;
    public saveChanges(callback?: AbstractCallback<void>): Promise<void>;
    public saveChanges(callback?: AbstractCallback<void>): Promise<void> {
        callback = callback || TypeUtil.NOOP;
        const saveChangeOperation = new BatchOperation(this);
        let command: BatchCommand; 
        const result = BluebirdPromise.resolve()
            .then(() => command = saveChangeOperation.createRequest())
            .then(() => {
                if (!command) {
                    return;
                }

                return this._requestExecutor.execute(command, this._sessionInfo)
                    .then(() => saveChangeOperation.setResult(command.result));
            })
            .finally(() => {
                if (command) {
                    command.dispose();
                }
            })
            .tap(() => callback())
            .tapCatch(err => callback(err));

        return Promise.resolve(result);
    }

    /**
     * Refreshes the specified entity from Raven server.
     */
    public refresh<TEntity extends object>(entity: TEntity): Promise<void> {
        const documentInfo = this.documentsByEntity.get(entity);
        if (!documentInfo) {
            throwError("InvalidOperationException", "Cannot refresh a transient instance");
        }

        this.incrementRequestCount();

        const command = new GetDocumentsCommand({ 
            id: documentInfo.id,
            conventions: this.conventions
        });
        return Promise.resolve()
            .then(() => this._requestExecutor.execute(command, this._sessionInfo))
            .then(() => this._refreshInternal(entity, command, documentInfo));
    }

    /**
     * Check if document exists without loading it
     */
    public exists(id: string): Promise<boolean> {
        if (!id) {
            return Promise.reject(getError("InvalidArgumentException", "id cannot be null"));
        }

        if (this.documentsById.getValue(id)) {
            return Promise.resolve(true);
        }

        const command = new HeadDocumentCommand(id, null);

        return Promise.resolve()
            .then(() => this._requestExecutor.execute(command, this._sessionInfo))
            .then(() => !TypeUtil.isNullOrUndefined(command.result));
    }

    public loadStartingWith<TEntity extends object>(
        idPrefix: string, 
        callback?: AbstractCallback<TEntity[]>): Promise<TEntity[]>;
    public loadStartingWith<TEntity extends object>(
        idPrefix: string, 
        opts: SessionLoadStartingWithOptions<TEntity>, 
        callback?: AbstractCallback<TEntity[]>): Promise<TEntity[]>;
    public loadStartingWith<TEntity extends object>(
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

        const result = BluebirdPromise.resolve()
            .then(() => this._loadStartingWithInternal(idPrefix, loadStartingWithOperation, opts))
            .then(() => loadStartingWithOperation.getDocuments<TEntity>(opts.documentType))
            .tap(results => callback(null, results))
            .tapCatch(err => callback(err));

        return Promise.resolve(result);
    }

    // TBD public void LoadStartingWithIntoStream(
    //    string idPrefix, Stream output, string matches = null, 
    // int start = 0, int pageSize = 25, string exclude = null, string startAfter = null)

    private _loadStartingWithInternal<TEntity extends object>(
        idPrefix: string, 
        operation: LoadStartingWithOperation, 
        opts: SessionLoadStartingWithOptions<TEntity>): Promise<GetDocumentsCommand> {
        const { matches, start, pageSize, exclude, startAfter } = 
            opts || {} as SessionLoadStartingWithOptions<TEntity>;
        operation.withStartWith(idPrefix, {
            matches, start, pageSize, exclude, startAfter
        });

        const command = operation.createRequest();
        return Promise.resolve()
            .then(() => {
                if (command) {
                    return this._requestExecutor.execute(command, this._sessionInfo);
                    // TBD handle stream
                }
            })
            .then(() => {
                operation.setResult(command.result);
                return command;
            });
    }

    public loadInternal<TResult extends object>(
        ids: string[], includes: string[], documentType: DocumentType<TResult>): 
        Promise<EntitiesCollectionObject<TResult>>  {
        const loadOperation = new LoadOperation(this);
        loadOperation.byIds(ids);
        loadOperation.withIncludes(includes);

        const command = loadOperation.createRequest();
        return Promise.resolve()
            .then(() => {
                if (command) {
                    return this._requestExecutor.execute(command, this._sessionInfo)
                        .then(() => loadOperation.setResult(command.result));
                }

                return;
            })
            .then(() => {
                const clazz = this.conventions.findEntityType(documentType);
                return loadOperation.getDocuments(clazz);
            });
    }

    /**
     * Begin a load while including the specified path
     */
    public include(path: string): ILoaderWithInclude {
        return new MultiLoaderWithInclude(this).include(path);
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
            collection = this.conventions.getCollectionNameForType(entityType);
        }

        return { indexName, collection };
    }

    private _attachments: IAttachmentsSessionOperations;

    public get attachments(): IAttachmentsSessionOperations {
        return this._attachments;
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
        const lazyValue = new Lazy<TLazyResult>(async () => {
            await this.executeAllPendingLazyOperations();
            return operation.result as TLazyResult;
        });
        return lazyValue;
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
}
