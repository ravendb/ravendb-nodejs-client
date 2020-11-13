import { GenerateEntityIdOnTheClient } from "./Identity/GenerateEntityIdOnTheClient";
import * as stream from "readable-stream";
import { RavenCommand } from "../Http/RavenCommand";
import { HttpRequestParameters } from "../Primitives/Http";
import { IMetadataDictionary } from "./Session/IMetadataDictionary";
import { createMetadataDictionary } from "../Mapping/MetadataAsDictionary";
import { CONSTANTS } from "../Constants";
import { getError, throwError } from "../Exceptions";
import { GetOperationStateCommand } from "./Operations/GetOperationStateOperation";
import { StringUtil } from "../Utility/StringUtil";
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
import { ErrorFirstCallback } from "../Types/Callbacks";
import { passResultToCallback } from "../Utility/PromiseUtil";
import { MetadataObject } from "./Session/MetadataObject";
import { CommandType } from "./Commands/CommandData";
import { TypeUtil } from "../Utility/TypeUtil";
import { IDisposable } from "../Types/Contracts";

export class BulkInsertOperation {
    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;

    private readonly _requestExecutor: RequestExecutor;
    private _bulkInsertExecuteTask: Promise<any>;
    private _completedWithError = false;

    private _first: boolean = true;
    private _inProgressCommand: CommandType;
    private readonly _countersOperation = new BulkInsertOperation._countersBulkInsertOperationClass(this);
    private readonly _attachmentsOperation = new BulkInsertOperation._attachmentsBulkInsertOperationClass(this);
    private _operationId = -1;

    private _useCompression: boolean = false;
    private readonly _timeSeriesBatchSize: number;

    private _concurrentCheck: number = 0;

    private _bulkInsertAborted: Promise<void>;
    private _abortReject: Function;
    private _aborted: boolean;
    private _currentWriter: stream.Readable;
    private _requestBodyStream: stream.PassThrough;
    private _pipelineFinished: Promise<void>;

    public constructor(database: string, store: IDocumentStore) {
        this._conventions = store.conventions;
        this._requestExecutor = store.getRequestExecutor(database);

        this._timeSeriesBatchSize = this._conventions.bulkInsert.timeSeriesBatchSize;

        this._generateEntityIdOnTheClient = new GenerateEntityIdOnTheClient(this._requestExecutor.conventions,
            entity => this._requestExecutor.conventions.generateDocumentId(database, entity));
        this._bulkInsertAborted = new Promise((_, reject) => this._abortReject = reject);

        this._bulkInsertAborted.catch(err => {
            // we're awaiting it elsewhere
        });
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
        idOrMetadataOrCallback?: string | IMetadataDictionary | ErrorFirstCallback<void>,
        metadataOrCallback?: IMetadataDictionary | ErrorFirstCallback<void>,
        callback?: ErrorFirstCallback<void>):
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
            callback = metadataOrCallback as ErrorFirstCallback<void>;
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
    public async store(entity: object, callback: ErrorFirstCallback<void>);
    public async store(entity: object, id: string);
    public async store(entity: object, metadata: IMetadataDictionary);
    public async store(entity: object, id: string, metadata: IMetadataDictionary);
    public async store(entity: object, id: string, callback: ErrorFirstCallback<void>);
    public async store(entity: object, metadata: IMetadataDictionary, callback: ErrorFirstCallback<void>);
    public async store(entity: object, id: string, metadata: IMetadataDictionary, callback: ErrorFirstCallback<void>);
    public async store(
        entity: object,
        idOrMetadataOrCallback?: string | IMetadataDictionary | ErrorFirstCallback<void>,
        metadataOrCallback?: IMetadataDictionary | ErrorFirstCallback<void>,
        callback?: ErrorFirstCallback<void>) {
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

        if (this._completedWithError || this._aborted) {
            await this._checkIfBulkInsertWasAborted();
        }

        if (!metadata) {
            metadata = createMetadataDictionary({
                raw: {}
            });
        }

        if (!(("@collection" as keyof MetadataObject) in metadata)) {
            const collection = this._requestExecutor.conventions.getCollectionNameForEntity(entity);
            if (collection) {
                metadata["@collection"] = collection;
            }
        }

        if (!("Raven-Node-Type" as keyof MetadataObject in metadata)) {
            const descriptor = this._conventions.getTypeDescriptorByEntity(entity);
            const jsType = this._requestExecutor.conventions.getJsTypeName(descriptor);
            if (jsType) {
                metadata["Raven-Node-Type"] = jsType;
            }
        }

        this._endPreviousCommandIfNeeded();

        if (this._first) {
            this._first = false;
        } else {
            this._writeComma();
        }

        this._inProgressCommand = "None";

        const documentInfo = new DocumentInfo();
        documentInfo.metadataInstance = metadata;
        let json = EntityToJson.convertEntityToJson(entity, this._conventions, documentInfo, true);

        if (this._conventions.remoteEntityFieldNameConvention) {
            json = this._conventions.transformObjectKeysToRemoteFieldNameConvention(json);
        }

        this._currentWriter.push(`{"Id":"`);
        this._writeString(id);
        const jsonString = JsonSerializer.getDefault().serialize(json);
        this._currentWriter.push(`","Type":"PUT","Document":${jsonString}}`);
    }

    private _handleErrors(documentId: string, e: Error) {
        const error = this._getExceptionFromOperation();
        if (error) {
            throw error;
        }

        throwError("InvalidOperationException", "Bulk insert error", e);
    }

    private _concurrencyCheck(): IDisposable {
        if (this._concurrentCheck) {
            throwError("InvalidOperationException", "Bulk Insert store methods cannot be executed concurrently.");
        }

        this._concurrentCheck = 1;

        return {
            dispose: () => this._concurrentCheck = 0
        }
    }

    private _endPreviousCommandIfNeeded() {
        if (this._inProgressCommand === "Counters") {
            this._countersOperation.endPreviousCommandIfNeeded();
        } else if (this._inProgressCommand === "TimeSeries") {
            BulkInsertOperation.throwAlreadyRunningTimeSeries();
        }
    }

    private _writeString(input: string): void {
        let result = "";
        for (let i = 0; i < input.length; i++) {
            const c = input[i];
            if (`"` === c) {
                if (i === 0 || input[i - 1] !== `\\`) {
                    this._currentWriter.push("\\");
                }
            }

            this._currentWriter.push(c);
        }
    }

    private _writeComma() {
        this._currentWriter.push(",");
    }

    private async _executeBeforeStore() {
        if (!this._currentWriter) {
            await this._waitForId();
            await this._ensureStream();
        }

        await this._checkIfBulkInsertWasAborted();
    }

    private async _checkIfBulkInsertWasAborted() {
        if (this._completedWithError) {
            try {
                await this._bulkInsertExecuteTask;
            } catch (error) {
                await this._throwBulkInsertAborted(error);
            } finally {
                this._currentWriter.emit("end");
            }
        }

        if (this._aborted) {
            try {
                await this._bulkInsertAborted;
            } finally {
                this._currentWriter.emit("end");
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
        const stateRequest = new GetOperationStateCommand(this._operationId);
        await this._requestExecutor.execute(stateRequest);
        if (!stateRequest.result) {
            return null;
        }

        const result = stateRequest.result["result"];

        if (stateRequest.result["status"] !== "Faulted") {
            return null;
        }

        return getError("BulkInsertAbortedException", result.error);
    }

    private async _ensureStream() {
        try {
            this._currentWriter = new stream.PassThrough();

            this._requestBodyStream = new stream.PassThrough();
            const bulkCommand =
                new BulkInsertCommand(this._operationId, this._requestBodyStream, this._useCompression);

            const bulkCommandPromise = this._requestExecutor.execute(bulkCommand);

            this._pipelineFinished = StreamUtil.pipelineAsync(this._currentWriter, this._requestBodyStream);
            this._currentWriter.push("[");

            this._bulkInsertExecuteTask = Promise.all([ 
                bulkCommandPromise,
                this._pipelineFinished
            ]);

            this._bulkInsertExecuteTask
                .catch(() => this._completedWithError = true);
            
        } catch (e) {
            throwError("RavenException", "Unable to open bulk insert stream.", e);
        }
    }

    public async abort(): Promise<void>;
    public async abort(callback: ErrorFirstCallback<void>): Promise<void>;
    public async abort(callback?: ErrorFirstCallback<void>): Promise<void> {
        const abortPromise = this._abortAsync();
        passResultToCallback(abortPromise, callback);
        return await abortPromise;
    }

    private async _abortAsync(): Promise<void> {
        this._aborted = true;

        if (this._operationId !== -1) {
            await this._waitForId();

            try {
                await this._requestExecutor.execute(new KillOperationCommand(this._operationId));
            } catch (err) {
                const bulkInsertError = getError("BulkInsertAbortedException",
                    "Unable to kill bulk insert operation, because it was not found on the server.", err);
                this._abortReject(bulkInsertError);
                return;
            }
        }

        this._abortReject(getError(
            "BulkInsertAbortedException", "Bulk insert was aborted by the user."));
    }

    public async finish(): Promise<void>;
    public async finish(callback: ErrorFirstCallback<void>): Promise<void>;
    public async finish(callback?: ErrorFirstCallback<void>): Promise<void> {
        const finishPromise = this._finishAsync();
        passResultToCallback(finishPromise, callback);
        return finishPromise;
    }

    private async _finishAsync() {
        this._endPreviousCommandIfNeeded();

        if (this._currentWriter) {
            this._currentWriter.push("]");
            this._currentWriter.push(null);
        }

        if (this._operationId === -1) {
            // closing without calling a single store.
            return;
        }

        if (this._completedWithError || this._aborted) {
            await this._checkIfBulkInsertWasAborted();
        }

        return Promise.race(
            [
                this._bulkInsertExecuteTask || Promise.resolve(),
                this._bulkInsertAborted || Promise.resolve()
            ]) 
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

    public attachmentsFor(id: string): IAttachmentsBulkInsert {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Document id cannot be null or empty");
        }

        return new BulkInsertOperation._attachmentsBulkInsertClass(this, id);
    }

    public countersFor(id: string): ICountersBulkInsert {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Document id cannot be null or empty");
        }

        return new BulkInsertOperation._countersBulkInsertClass(this, id);
    }

    public timeSeriesFor(id: string, name: string): ITimeSeriesBulkInsert {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Document id cannot be null or empty");
        }

        if (StringUtil.isNullOrEmpty(name)) {
            throwError("InvalidArgumentException", "Time series name cannot be null or empty");
        }

        return new BulkInsertOperation._timeSeriesBulkInsertClass(this, id, name);
    }

    static throwAlreadyRunningTimeSeries() {
        throwError("InvalidOperationException", "There is an already running time series operation, did you forget to close it?");
    }

    private static readonly _countersBulkInsertClass = class CountersBulkInsert implements ICountersBulkInsert {
        private readonly _operation: BulkInsertOperation;
        private readonly _id: string;

        public constructor(operation: BulkInsertOperation, id: string) {
            this._operation = operation;
            this._id = id;
        }

        public increment(name: string): Promise<void>;
        public increment(name: string, delta: number): Promise<void>;
        public increment(name: string, delta: number = 1): Promise<void> {
            return this._operation._countersOperation.increment(this._id, name, delta);
        }
    }

    private static _countersBulkInsertOperationClass = class CountersBulkInsertOperation {
        private readonly _operation: BulkInsertOperation;
        private _id: string;
        private _first: boolean = true;
        private static readonly MAX_COUNTERS_IN_BATCH = 1024;
        private _countersInBatch = 0;

        public constructor(bulkInsertOperation: BulkInsertOperation) {
            this._operation = bulkInsertOperation;
        }

        public async increment(id: string, name: string);
        public async increment(id: string, name: string, delta: number);
        public async increment(id: string, name: string, delta: number = 1) {
            const check = this._operation._concurrencyCheck();

            try {

                await this._operation._executeBeforeStore();

                if (this._operation._inProgressCommand === "TimeSeries") {
                    BulkInsertOperation.throwAlreadyRunningTimeSeries();
                }

                try {
                    const isFirst = !this._id;

                    if (isFirst || !StringUtil.equalsIgnoreCase(this._id, id)) {
                        if (!isFirst) {
                            //we need to end the command for the previous document id
                            this._operation._currentWriter.push("]}},");
                        } else if (!this._operation._first) {
                            this._operation._writeComma();
                        }

                        this._operation._first = false;

                        this._id = id;
                        this._operation._inProgressCommand = "Counters";

                        this._writePrefixForNewCommand();
                    }

                    if (this._countersInBatch >= CountersBulkInsertOperation.MAX_COUNTERS_IN_BATCH) {
                        this._operation._currentWriter.push("]}},");

                        this._writePrefixForNewCommand();
                    }

                    this._countersInBatch++;

                    if (!this._first) {
                        this._operation._writeComma();
                    }

                    this._first = false;

                    this._operation._currentWriter.push("{\"Type\":\"Increment\",\"CounterName\":\"");
                    this._operation._writeString(name);
                    this._operation._currentWriter.push("\",\"Delta\":");
                    this._operation._currentWriter.push(delta.toString());
                    this._operation._currentWriter.push("}");

                } catch (e) {
                    this._operation._handleErrors(this._id, e);
                }
            } finally {
                check.dispose();
            }
        }

        public endPreviousCommandIfNeeded() {
            if (!this._id) {
                return;
            }

            this._operation._currentWriter.push("]}}");
            this._id = null;
        }

        private _writePrefixForNewCommand() {
            this._first = true;
            this._countersInBatch = 0;

            this._operation._currentWriter.push("{\"Id\":\"");
            this._operation._writeString(this._id);
            this._operation._currentWriter.push("\",\"Type\":\"Counters\",\"Counters\":{\"DocumentId\":\"");
            this._operation._writeString(this._id);
            this._operation._currentWriter.push("\",\"Operations\":[");
        }
    }

    private static _timeSeriesBulkInsertClass = class TimeSeriesBulkInsert implements ITimeSeriesBulkInsert, IDisposable {
        private readonly _operation: BulkInsertOperation;
        private readonly _id: string;
        private readonly _name: string;
        private _first: boolean = true;
        private _timeSeriesInBatch: number = 0;

        public constructor(operation: BulkInsertOperation, id: string, name: string) {
            operation._endPreviousCommandIfNeeded();

            this._operation = operation;
            this._id = id;
            this._name = name;

            this._operation._inProgressCommand = "TimeSeries";
        }

        public append(timestamp: Date, value: number): Promise<void>;
        public append(timestamp: Date, value: number, tag: string): Promise<void>;
        public append(timestamp: Date, values: number[]): Promise<void>;
        public append(timestamp: Date, values: number[], tag: string): Promise<void>;
        public append(timestamp: Date, valueOrValues: number | number[], tag?: string): Promise<void> {
            if (TypeUtil.isArray(valueOrValues)) {
                return this._appendInternal(timestamp, valueOrValues, tag);
            } else {
                return this._appendInternal(timestamp, [ valueOrValues ], tag);
            }
        }

        private async _appendInternal(timestamp: Date, values: number[], tag: string): Promise<void> {
            const check = this._operation._concurrencyCheck();
            try {

                await this._operation._executeBeforeStore();

                try {
                    if (this._first) {
                        if (!this._operation._first) {
                            this._operation._writeComma();
                        }

                        this._writePrefixForNewCommand();
                    } else if (this._timeSeriesInBatch >= this._operation._timeSeriesBatchSize) {
                        this._operation._currentWriter.push("]}},");
                        this._writePrefixForNewCommand();
                    }

                    this._timeSeriesInBatch++;

                    if (!this._first) {
                        this._operation._writeComma();
                    }

                    this._first = false;

                    this._operation._currentWriter.push("[");
                    this._operation._currentWriter.push(timestamp.getTime().toString());
                    this._operation._writeComma();

                    this._operation._currentWriter.push(values.length.toString());
                    this._operation._writeComma();

                    let firstValue = true;

                    for (const value of values) {
                        if (!firstValue) {
                            this._operation._writeComma();
                        }

                        firstValue = false;
                        this._operation._currentWriter.push(value.toString());
                    }

                    if (tag) {
                        this._operation._currentWriter.push(",\"");
                        this._operation._writeString(tag);
                        this._operation._currentWriter.push("\"");
                    }

                    this._operation._currentWriter.push("]");
                } catch (e) {
                    this._operation._handleErrors(this._id, e);
                }
            } finally {
                check.dispose();
            }
        }

        private _writePrefixForNewCommand() {
            this._first = true;
            this._timeSeriesInBatch = 0;

            this._operation._currentWriter.push("{\"Id\":\"");
            this._operation._writeString(this._id);
            this._operation._currentWriter.push("\",\"Type\":\"TimeSeriesBulkInsert\",\"TimeSeries\":{\"Name\":\"");
            this._operation._writeString(this._name);
            this._operation._currentWriter.push("\",\"TimeFormat\":\"UnixTimeInMs\",\"Appends\":[");
        }

        dispose(): void {
            this._operation._inProgressCommand = "None";

            if (!this._first) {
                this._operation._currentWriter.push("]}}");
            }
        }
    }

    private static _attachmentsBulkInsertClass = class AttachmentsBulkInsert implements IAttachmentsBulkInsert {
        private readonly _operation: BulkInsertOperation;
        private readonly _id: string;

        public constructor(operation: BulkInsertOperation, id: string) {
            this._operation = operation;
            this._id = id;
        }

        public store(name: string, bytes: Buffer): Promise<void>;
        public store(name: string, bytes: Buffer, contentType: string): Promise<void>;
        public store(name: string, bytes: Buffer, contentType?: string): Promise<void> {
            return this._operation._attachmentsOperation.store(this._id, name, bytes, contentType);
        }
    }

    private static _attachmentsBulkInsertOperationClass = class AttachmentsBulkInsertOperation {
        private readonly _operation: BulkInsertOperation;

        public constructor(operation: BulkInsertOperation) {
            this._operation = operation;
        }

        public async store(id: string, name: string, bytes: Buffer): Promise<void>;
        public async store(id: string, name: string, bytes: Buffer, contentType: string): Promise<void>;
        public async store(id: string, name: string, bytes: Buffer, contentType?: string): Promise<void> {
            const check = this._operation._concurrencyCheck();

            try {
                this._operation._endPreviousCommandIfNeeded();

                await this._operation._executeBeforeStore();

                try {
                    if (!this._operation._first) {
                        this._operation._writeComma();
                    }

                    this._operation._currentWriter.push("{\"Id\":\"");
                    this._operation._writeString(id);
                    this._operation._currentWriter.push("\",\"Type\":\"AttachmentPUT\",\"Name\":\"");
                    this._operation._writeString(name);

                    if (contentType) {
                        this._operation._currentWriter.push("\",\"ContentType\":\"");
                        this._operation._writeString(contentType);
                    }

                    this._operation._currentWriter.push("\",\"ContentLength\":");
                    this._operation._currentWriter.push(bytes.length.toString());
                    this._operation._currentWriter.push("}");

                    this._operation._currentWriter.push(bytes);
                } catch (e) {
                    this._operation._handleErrors(id, e);
                }
            } finally {
                check.dispose();
            }
        }
    }
}

export interface ICountersBulkInsert {
    increment(name: string): Promise<void>;
    increment(name: string, delta: number): Promise<void>;
}

export interface ITimeSeriesBulkInsert extends IDisposable {
    append(timestamp: Date, value: number): Promise<void>
    append(timestamp: Date, value: number, tag: string): Promise<void>;
    append(timestamp: Date, values: number[]): Promise<void>;
    append(timestamp: Date, values: number[], tag: string): Promise<void>;
}

export interface IAttachmentsBulkInsert {
    store(name: string, bytes: Buffer): Promise<void>;
    store(name: string, bytes: Buffer, contentType: string): Promise<void>;
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
        // TODO: useCompression ? new GzipCompressingEntity(_stream) : _stream);
        return { 
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
