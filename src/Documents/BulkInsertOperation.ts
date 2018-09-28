import {GenerateEntityIdOnTheClient} from "./Identity/GenerateEntityIdOnTheClient";
import * as stream from "readable-stream";
import * as BluebirdPromise from "bluebird";
import { RavenCommand } from "../Http/RavenCommand";
import {HttpRequestParameters} from "../Primitives/Http";
import {IMetadataDictionary} from "./Session/IMetadataDictionary";
import { createMetadataDictionary } from "../Mapping/MetadataAsDictionary";
import {CONSTANTS} from "../Constants";
import {getError, throwError} from "../Exceptions";
import {GetOperationStateCommand} from "./Operations/GetOperationStateOperation";
import {StringUtil} from "../Utility/StringUtil";
import * as StreamUtil from "../Utility/StreamUtil";
import { JsonSerializer } from "../Mapping/Json/Serializer";
import { RequestExecutor } from "../Http/RequestExecutor";
import { IDocumentStore } from "./IDocumentStore";
import { GetNextOperationIdCommand } from "./Commands/GetNextOperationIdCommand";
import { DocumentInfo } from "./Session/DocumentInfo";
import { EntityToJson } from "./Session/EntityToJson";
import { KillOperationCommand } from "./Commands/KillOperationCommand";
import { DocumentConventions } from "./Conventions/DocumentConventions";
import { ServerNode } from "../Http/ServerNode";
import { AbstractCallback } from "../Types/Callbacks";
import { passResultToCallback } from "../Utility/PromiseUtil";
import * as through2 from "through2";

export class BulkInsertOperation {
    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;

    private readonly _requestExecutor: RequestExecutor;
    private _bulkInsertExecuteTask: Promise<void>;
    private _pipelinePromise: Promise<void>;
    private _completedWithError = false;
    private _completedWithPipelineError = false;

    private _first: boolean = true;
    private _operationId = -1;

    private _useCompression: boolean = false;

    public constructor(database: string, store: IDocumentStore) {
        this._conventions = store.conventions;
        this._requestExecutor = store.getRequestExecutor(database);

        this._generateEntityIdOnTheClient = new GenerateEntityIdOnTheClient(this._requestExecutor.conventions,
                entity => this._requestExecutor.conventions.generateDocumentId(database, entity));
    }

    get useCompression(): boolean {
        return this._useCompression;
    }

    set useCompression(value: boolean) {
        this._useCompression = value;
    }

    private async _throwBulkInsertAborted(e: Error) {
        const error = await this._getExceptionFromOperation();
        throwError("BulkInsertAbortedException", "Failed to execute bulk insert", error || e);
    }

    private async _waitForId(): Promise<void> {
        if (this._operationId !== -1) {
            return;
        }

        const bulkInsertGetIdRequest = new GetNextOperationIdCommand();
        await this._requestExecutor.execute(bulkInsertGetIdRequest);
        this._operationId = bulkInsertGetIdRequest.result;
    }

    private static _typeCheckStoreArgs(
        idOrMetadataOrCallback?: string | IMetadataDictionary | AbstractCallback<void>, 
        metadataOrCallback?: IMetadataDictionary | AbstractCallback<void>,
        callback?: AbstractCallback<void>): 
            { id: string, getId: boolean, metadata: IMetadataDictionary, cb: () => void } {

        let id: string;
        let metadata;
        let getId = false;

        if (typeof idOrMetadataOrCallback === "function") {
            callback = idOrMetadataOrCallback;
        } else if (typeof idOrMetadataOrCallback === "string" || callback) {
            id = idOrMetadataOrCallback as string;
            if (typeof metadataOrCallback === "function") {
                callback = metadataOrCallback;
            } else {
                metadata = metadataOrCallback;
            }
        } else {
            metadata = idOrMetadataOrCallback;
            callback = metadataOrCallback as AbstractCallback<void>;
            if (metadata && (CONSTANTS.Documents.Metadata.ID in metadata)) {
                id = metadata[CONSTANTS.Documents.Metadata.ID];
            }
        }
        
        if (!id) {
            getId = true;
        }

        return { id, metadata, getId, cb: callback };
    }

    public async store(entity: object);
    public async store(entity: object, callback: AbstractCallback<void>);
    public async store(entity: object, id: string);
    public async store(entity: object, metadata: IMetadataDictionary);
    public async store(entity: object, id: string, metadata: IMetadataDictionary);
    public async store(entity: object, id: string, callback: AbstractCallback<void>);
    public async store(entity: object, metadata: IMetadataDictionary, callback: AbstractCallback<void>);
    public async store(entity: object, id: string, metadata: IMetadataDictionary, callback: AbstractCallback<void>);
    public async store(
        entity: object,
        idOrMetadataOrCallback?: string | IMetadataDictionary | AbstractCallback<void>, 
        metadataOrCallback?: IMetadataDictionary | AbstractCallback<void>,
        callback?: AbstractCallback<void>) {
        let opts: { id: string, getId: boolean, metadata: IMetadataDictionary, cb: () => void };
        try {
            // tslint:disable-next-line:prefer-const
            opts = BulkInsertOperation._typeCheckStoreArgs(
                idOrMetadataOrCallback, metadataOrCallback, callback);
        } catch (err) {
            callback(err);
        }

        const result = this._store(entity, opts);
        passResultToCallback(result, opts.cb);
        return result;
    }

    private async _store(
        entity: object,
        { id, getId, metadata }: { id: string, getId: boolean, metadata: IMetadataDictionary }) {

        id = getId ? await this._getId(entity) : id;
        BulkInsertOperation._verifyValidId(id);

        if (!this._currentWriter) {
            await this._waitForId();
            await this._ensureStream();
        }

        if (this._completedWithError) {
           await this._checkIfBulkInsertWasAborted();
        }

        if (this._completedWithPipelineError) {
            try {
                await this._pipelinePromise;
            } catch (error) {
                throwError("BulkInsertStreamError", "Failed to execute bulk insert", error);
            }
        }

        if (!metadata) {
            metadata = createMetadataDictionary({
                raw: {}
            });
        }

        if (!(CONSTANTS.Documents.Metadata.COLLECTION in metadata)) {
            const collection = this._requestExecutor.conventions.getCollectionNameForEntity(entity);
            if (collection) {
                metadata[CONSTANTS.Documents.Metadata.COLLECTION] = collection;
            }
        }

        if (!(CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE in metadata)) {
            const descriptor = this._conventions.getEntityTypeDescriptor(entity);
            const jsType = this._requestExecutor.conventions.getJsTypeName(descriptor);
            if (jsType) {
                metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = jsType;
            }
        }

        if (!this._first) {
            this._currentWriter.push(",");
        }

        this._first = false;

        this._currentWriter.push("{'Id':'");
        this._currentWriter.push(id);
        this._currentWriter.push("','Type':'PUT','Document':");

        const documentInfo = new DocumentInfo();
        documentInfo.metadataInstance = metadata;
        let json = EntityToJson.convertEntityToJson(entity, this._conventions, documentInfo);
        
        if (this._conventions.remoteEntityFieldNameConvention) {
            json = this._conventions.transformObjectKeysToRemoteFieldNameConvention(json);
        }

        const jsonString = JsonSerializer.getDefault().serialize(json);
        this._currentWriter.push(jsonString);
        this._currentWriter.push("}");

    }

    private async _checkIfBulkInsertWasAborted() {
        if (this._completedWithError) {
            try {
                await this._bulkInsertExecuteTask;
            } catch (error) {
                await this._throwBulkInsertAborted(error);
            }
        }

        if (this._completedWithPipelineError) {
            try {
                await this._pipelinePromise;
            } catch (error) {
                throwError("BulkInsertStreamError", "Failed to execute bulk insert.", error);
            }
        }
    }

    private static _verifyValidId(id: string): void {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Document id must have a non empty value");
        }

        if (id.endsWith("|")) {
            throwError("NotSupportedException", "Document ids cannot end with '|', but was called with " + id);
        }
    }

    private async _getExceptionFromOperation(): Promise<Error> {
        const stateRequest = new GetOperationStateCommand(this._conventions, this._operationId);
        await this._requestExecutor.execute(stateRequest);

        const result = stateRequest.result["result"];

        if (stateRequest.result["status"] !== "Faulted") {
            return null;
        }

        return getError("BulkInsertAbortedException", result.error);
    }

    private _currentWriter: stream.Readable;
    private _requestBodyStream: stream.Readable;
    private static readonly _maxSizeInBuffer = 1024 * 1024;

    private async _ensureStream() {
        try {

            this._currentWriter = new stream.PassThrough(); 

            const streams: stream.Stream[] = [ this._currentWriter ];

            this._requestBodyStream = this._getBufferingWriteable(); 
            streams.push(this._requestBodyStream);

            const bulkCommand =
                new BulkInsertCommand(this._operationId, this._requestBodyStream, this._useCompression);

            this._bulkInsertExecuteTask = this._requestExecutor.execute(bulkCommand);

            this._bulkInsertExecuteTask.catch(() => {
                this._completedWithError = true;
            });

            this._currentWriter.push("[");
            
            this._pipelinePromise = StreamUtil.pipelineAsync(...streams);

            this._pipelinePromise.catch(err => {
                this._completedWithPipelineError = true;
            });
        } catch (e) {
            throwError("RavenException", "Unable to open bulk insert stream.", e);
        }
    }

    private _getBufferingWriteable(): stream.Transform {
        let buffer = Buffer.from([]);
        return through2(function (chunk, enc, callback) {
            buffer = Buffer.concat([buffer, chunk]);

            if (buffer.length > BulkInsertOperation._maxSizeInBuffer) {
                this.push(buffer, enc);
                buffer = Buffer.from([]);
            }

            callback();
        }, function (callback) {
            if (buffer.length) {
                // push remaining part
                this.push(buffer);
            }
            this.push(null);

            callback();
        });
    }

    public async abort(): Promise<void>; 
    public async abort(callback: AbstractCallback<void>): Promise<void>;
    public async abort(callback?: AbstractCallback<void>): Promise<void> {
        const abortPromise = this._abortAsync();
        passResultToCallback(abortPromise, callback);
        return abortPromise;
    }

    private async _abortAsync(): Promise<void> { 
        if (this._operationId === -1) {
            return; // nothing was done, nothing to kill
        }

        await this._waitForId();

        try {
            await this._requestExecutor.execute(new KillOperationCommand(this._operationId));
        } catch (err) {
            throwError("BulkInsertAbortedException",
                "Unable to kill ths bulk insert operation, because it was not found on the server.", err);
        }
    }

    public async finish(): Promise<void>;
    public async finish(callback: AbstractCallback<void>): Promise<void>;
    public async finish(callback?: AbstractCallback<void>): Promise<void> {
        const finishPromise = this._finishAsync();
        passResultToCallback(finishPromise, callback);
        return finishPromise;
    }

    private async _finishAsync() {
        if (this._currentWriter) {
            this._currentWriter.push("]");
            this._currentWriter.push(null);
        }

        if (this._operationId === -1) {
            // closing without calling a single store.
            return;
        }

        if (this._bulkInsertExecuteTask !== null) {
            await this._checkIfBulkInsertWasAborted();
        }

        return Promise.all([ this._bulkInsertExecuteTask, this._pipelinePromise ])
            // tslint:disable-next-line:no-empty
            .then(() => {});
    }

    private readonly _conventions: DocumentConventions;

    private async _getId(entity: any) {
        let idRef: string;
        if (this._generateEntityIdOnTheClient.tryGetIdFromInstance(entity, id => idRef = id)) {
            return idRef;
        }

        idRef = await this._generateEntityIdOnTheClient.generateDocumentKeyForStorage(entity);

        this._generateEntityIdOnTheClient.trySetIdentity(entity, idRef); // set id property if it was null;
        return idRef;
    }
}

export class BulkInsertCommand extends RavenCommand<void> {
    public get isReadRequest() {
        return false;
    }

    private readonly _stream: stream.Readable;
    private readonly _id: number;
    private _useCompression: boolean;

    public constructor(id: number, stream: stream.Readable, useCompression: boolean) {
        super();

        this._stream = stream;
        this._id = id;
        this._useCompression = useCompression;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/bulk_insert?id=" + this._id;

        const headers = this._headers().typeAppJson().build();

        return { //TODO: useCompression ? new GzipCompressingEntity(_stream) : _stream);
            method: "POST",
            uri,
            body: this._stream,
            headers
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return throwError("NotImplementedException", "Not implemented");
    }

}
