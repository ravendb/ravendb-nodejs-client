import { GenerateEntityIdOnTheClient } from "./Identity/GenerateEntityIdOnTheClient.js";
import { Readable, Stream } from "node:stream";
import { RavenCommand } from "../Http/RavenCommand.js";
import { HttpRequestParameters } from "../Primitives/Http.js";
import { IMetadataDictionary } from "./Session/IMetadataDictionary.js";
import { MetadataInternal } from "../Mapping/MetadataAsDictionary.js";
import { CONSTANTS, HEADERS } from "../Constants.js";
import { getError, throwError } from "../Exceptions/index.js";
import { GetOperationStateCommand } from "./Operations/GetOperationStateOperation.js";
import { StringUtil } from "../Utility/StringUtil.js";
import { JsonSerializer } from "../Mapping/Json/Serializer.js";
import { RequestExecutor } from "../Http/RequestExecutor.js";
import { IDocumentStore } from "./IDocumentStore.js";
import { GetNextOperationIdCommand } from "./Commands/GetNextOperationIdCommand.js";
import { DocumentInfo } from "./Session/DocumentInfo.js";
import { EntityToJson } from "./Session/EntityToJson.js";
import { KillOperationCommand } from "./Commands/KillOperationCommand.js";
import { DocumentConventions } from "./Conventions/DocumentConventions.js";
import { ServerNode } from "../Http/ServerNode.js";
import { MetadataObject } from "./Session/MetadataObject.js";
import { CommandType } from "./Commands/CommandData.js";
import { TypeUtil } from "../Utility/TypeUtil.js";
import { IDisposable } from "../Types/Contracts.js";
import { TypedTimeSeriesEntry } from "./Session/TimeSeries/TypedTimeSeriesEntry.js";
import { ClassConstructor, EntityConstructor } from "../Types/index.js";
import { TimeSeriesOperations } from "./TimeSeries/TimeSeriesOperations.js";
import { TimeSeriesValuesHelper } from "./Session/TimeSeries/TimeSeriesValuesHelper.js";
import { Timer } from "../Primitives/Timer.js";
import { EventEmitter } from "node:events";
import { BulkInsertOnProgressEventArgs } from "./Session/SessionEvents.js";
import { acquireSemaphore } from "../Utility/SemaphoreUtil.js";
import { Buffer } from "node:buffer";
import { Semaphore } from "../Utility/Semaphore.js";
import { BulkInsertOperationBase } from "./BulkInsert/BulkInsertOperationBase.js";
import { BulkInsertOptions } from "./BulkInsert/BulkInsertOptions.js";
import { BulkInsertWriter } from "./BulkInsert/BulkInsertWriter.js";
import { HttpCompressionAlgorithm } from "../Http/HttpCompressionAlgorithm.js";
import { RemoteAttachmentParameters } from "./Operations/Attachments/RemoteAttachmentParameters.js";

export class BulkInsertOperation extends BulkInsertOperationBase<object> {

    private static _countersBulkInsertOperationClass = class CountersBulkInsertOperation {
        private readonly _operation: BulkInsertOperation;
        private _id: string;
        private _first: boolean = true;
        private static readonly MAX_COUNTERS_IN_BATCH = 1024;
        private _countersInBatch = 0;

        public constructor(bulkInsertOperation: BulkInsertOperation) {
            this._operation = bulkInsertOperation;
        }

        public async increment(id: string, name: string): Promise<void>;
        public async increment(id: string, name: string, delta: number): Promise<void>;
        public async increment(id: string, name: string, delta: number = 1): Promise<void> {
            const check = await this._operation._concurrencyCheck();

            try {
                await this._operation._executeBeforeStore();

                if (this._operation._inProgressCommand === "TimeSeries") {
                    BulkInsertOperation._timeSeriesBulkInsertBaseClass.throwAlreadyRunningTimeSeries();
                }

                try {
                    const isFirst = !this._id;

                    if (isFirst || !StringUtil.equalsIgnoreCase(this._id, id)) {
                        if (!isFirst) {
                            //we need to end the command for the previous document id
                            this._operation._writer.write("]}},");
                        } else if (!this._operation._first) {
                            this._operation._writeComma();
                        }

                        this._operation._first = false;

                        this._id = id;
                        this._operation._inProgressCommand = "Counters";

                        this._writePrefixForNewCommand();
                    }

                    if (this._countersInBatch >= CountersBulkInsertOperation.MAX_COUNTERS_IN_BATCH) {
                        this._operation._writer.write("]}},");

                        this._writePrefixForNewCommand();
                    }

                    this._countersInBatch++;

                    if (!this._first) {
                        this._operation._writeComma();
                    }

                    this._first = false;

                    this._operation._writer.write(`{"Type":"Increment","CounterName":"`);
                    this._operation._writeString(name);
                    this._operation._writer.write(`","Delta":`);
                    this._operation._writer.write(delta.toString());
                    this._operation._writer.write("}");

                    await this._operation.flushIfNeeded();

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

            this._operation._writer.write("]}}");
            this._id = null;
        }

        private _writePrefixForNewCommand() {
            this._first = true;
            this._countersInBatch = 0;

            this._operation._writer.write(`{"Id":"`);
            this._operation._writeString(this._id);
            this._operation._writer.write(`","Type":"Counters","Counters":{"DocumentId":"`);
            this._operation._writeString(this._id);
            this._operation._writer.write(`","Operations":[`);
        }
    }

    private static _timeSeriesBulkInsertBaseClass = class TimeSeriesBulkInsertBase implements IDisposable {
        private readonly _operation: BulkInsertOperation;
        private readonly _id: string;
        private readonly _name: string;
        private _first: boolean = true;
        private _timeSeriesInBatch: number = 0;

        protected constructor(operation: BulkInsertOperation, id: string, name: string) {
            operation._endPreviousCommandIfNeeded();

            this._operation = operation;
            this._id = id;
            this._name = name;

            this._operation._inProgressCommand = "TimeSeries";
        }

        protected async _appendInternal(timestamp: Date, values: number[], tag: string): Promise<void> {
            const check = await this._operation._concurrencyCheck();
            try {
                await this._operation._executeBeforeStore();

                try {
                    if (this._first) {
                        if (!this._operation._first) {
                            this._operation._writeComma();
                        }

                        this._writePrefixForNewCommand();
                    } else if (this._timeSeriesInBatch >= this._operation._timeSeriesBatchSize) {
                        this._operation._writer.write("]}},");
                        this._writePrefixForNewCommand();
                    }

                    this._timeSeriesInBatch++;

                    if (!this._first) {
                        this._operation._writeComma();
                    }

                    this._first = false;

                    this._operation._writer.write("[");
                    this._operation._writer.write(timestamp.getTime().toString());
                    this._operation._writeComma();

                    this._operation._writer.write(values.length.toString());
                    this._operation._writeComma();

                    let firstValue = true;

                    for (const value of values) {
                        if (!firstValue) {
                            this._operation._writeComma();
                        }

                        firstValue = false;
                        this._operation._writer.write(((value ?? 0).toString()));
                    }

                    if (tag) {
                        this._operation._writer.write(`,"`);
                        this._operation._writeString(tag);
                        this._operation._writer.write(`"`);
                    }

                    this._operation._writer.write("]");

                    await this._operation.flushIfNeeded();
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

            this._operation._writer.write(`{"Id":"`);
            this._operation._writeString(this._id);
            this._operation._writer.write(`","Type":"TimeSeriesBulkInsert","TimeSeries":{"Name":"`);
            this._operation._writeString(this._name);
            this._operation._writer.write(`","TimeFormat":"UnixTimeInMs","Appends":[`);
        }

        static throwAlreadyRunningTimeSeries() {
            throwError("BulkInsertInvalidOperationException", "There is an already running time series operation, did you forget to close it?");
        }

        dispose(): void {
            this._operation._inProgressCommand = "None";

            if (!this._first) {
                this._operation._writer.write("]}}");
            }
        }
    }

    private static _timeSeriesBulkInsertClass = class TimeSeriesBulkInsert extends BulkInsertOperation._timeSeriesBulkInsertBaseClass implements ITimeSeriesBulkInsert {
        public constructor(operation: BulkInsertOperation, id: string, name: string) {
            super(operation, id, name);
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
    }

    private static _typedTimeSeriesBulkInsertClass = class TypedTimeSeriesBulkInsert<T extends object> extends BulkInsertOperation._timeSeriesBulkInsertBaseClass implements ITypedTimeSeriesBulkInsert<T> {

        private readonly clazz: ClassConstructor<T>;

        public constructor(operation: BulkInsertOperation, clazz: ClassConstructor<T>, id: string, name: string) {
            super(operation, id, name);

            this.clazz = clazz;
        }

        append(timestamp: Date, value: T): Promise<void>;
        append(timestamp: Date, value: T, tag: string): Promise<void>;
        append(entry: TypedTimeSeriesEntry<T>): Promise<void>;
        append(timestampOrEntry: Date | TypedTimeSeriesEntry<T>, value?: T, tag?: string): Promise<void> {
            if (timestampOrEntry instanceof TypedTimeSeriesEntry) {
                return this.append(timestampOrEntry.timestamp, timestampOrEntry.value, timestampOrEntry.tag);
            } else  {
                const values = TimeSeriesValuesHelper.getValues(this.clazz, value);
                return this._appendInternal(timestampOrEntry, values, tag);
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
        public store(name: string, bytes: Buffer, contentType?: string, remoteParameters?: RemoteAttachmentParameters): Promise<void> {
            return this._operation._attachmentsOperation.store(this._id, name, bytes, contentType, remoteParameters);
        }
    }

    private static _attachmentsBulkInsertOperationClass = class AttachmentsBulkInsertOperation {
        private readonly _operation: BulkInsertOperation;

        public constructor(operation: BulkInsertOperation) {
            this._operation = operation;
        }

        public async store(id: string, name: string, bytes: Buffer): Promise<void>;
        public async store(id: string, name: string, bytes: Buffer, contentType: string): Promise<void>;
        public async store(id: string, name: string, bytes: Buffer, contentType: string, remoteParameters: RemoteAttachmentParameters): Promise<void>;
        public async store(id: string, name: string, bytes: Buffer, contentType?: string, remoteParameters?: RemoteAttachmentParameters): Promise<void> {
            const check = await this._operation._concurrencyCheck();

            try {
                this._operation._endPreviousCommandIfNeeded();

                await this._operation._executeBeforeStore();

                try {
                    if (!this._operation._first) {
                        this._operation._writeComma();
                    }

                    this._operation._writer.write(`{"Id":"`);
                    this._operation._writeString(id);
                    this._operation._writer.write(`","Type":"AttachmentPUT","Name":"`);
                    this._operation._writeString(name);
                    this._operation._writer.write(`"`);

                    if (contentType) {
                        this._operation._writer.write(`,"ContentType":"`);
                        this._operation._writeString(contentType);
                        this._operation._writer.write(`"`);
                    }

                    if (remoteParameters) {
                        this._operation._writer.write(`,"RemoteParameters":{"Identifier":"`);
                        this._operation._writeString(remoteParameters.identifier);
                        this._operation._writer.write(`"`)

                        this._operation._writer.write(`,"Flags":"`);
                        this._operation._writeString(remoteParameters.flags);
                        this._operation._writer.write(`"`)

                        if (remoteParameters.at) {
                            this._operation._writer.write(`,"At":"`);
                            this._operation._writeString(remoteParameters.at.toISOString());
                            this._operation._writer.write(`"`);
                        }

                        this._operation._writer.write(`}`);
                    }

                    this._operation._writer.write(`,"ContentLength":`);
                    this._operation._writer.write(bytes.length.toString());
                    this._operation._writer.write("}");

                    await this._operation.flushIfNeeded();

                    this._operation._writer.write(bytes);

                    await this._operation.flushIfNeeded();
                } catch (e) {
                    this._operation._handleErrors(id, e);
                }
            } finally {
                check.dispose();
            }
        }
    }

    private _emitter = new EventEmitter();

    private _options: BulkInsertOptions;
    private _database: string;
    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;

    private readonly _requestExecutor: RequestExecutor;

    private _inProgressCommand: CommandType;
    private readonly _countersOperation = new BulkInsertOperation._countersBulkInsertOperationClass(this);
    private readonly _attachmentsOperation = new BulkInsertOperation._attachmentsBulkInsertOperationClass(this);
    private _nodeTag: string;

    private readonly _timeSeriesBatchSize: number;
    private _concurrentCheck: number = 0;
    private _first: boolean = true;
    private _useCompression: boolean = false;
    private _unsubscribeChanges: IDisposable;

    private _onProgressInitialized = false;

    private _timer: Timer;

    private readonly _streamLock: Semaphore;
    private _heartbeatCheckInterval = 40_000;

    private _writer: BulkInsertWriter;

    private readonly _conventions: DocumentConventions;
    private readonly _store: IDocumentStore;

    public constructor(database: string, store: IDocumentStore, options?: BulkInsertOptions) {
        super();
        if (StringUtil.isNullOrEmpty(database)) {
            BulkInsertOperation._throwNoDatabase();
        }

        this._useCompression = options ? options.useCompression : false;
        this._options = options ?? {};
        this._database = database;
        this._conventions = store.conventions;
        this._store = store;

        this._requestExecutor = store.getRequestExecutor(database);
        this._writer = new BulkInsertWriter();
        this._writer.initialize();
        this._timeSeriesBatchSize = this._conventions.bulkInsert.timeSeriesBatchSize;

        this._generateEntityIdOnTheClient = new GenerateEntityIdOnTheClient(this._requestExecutor.conventions,
            entity => this._requestExecutor.conventions.generateDocumentId(database, entity));

        this._streamLock = new Semaphore(1);

        const timerState: TimerState = {
            parent: this,
            timer: null
        };

        this._timer = new Timer(() => BulkInsertOperation._handleHeartbeat(timerState), this._heartbeatCheckInterval, this._heartbeatCheckInterval);
        timerState.timer = this._timer;
    }

    private static async _handleHeartbeat(timerState: TimerState): Promise<void> {
        const bulkInsert = timerState.parent;
        if (!bulkInsert) {
            timerState.timer.dispose();
            return;
        }

        await bulkInsert.sendHeartBeat();
    }

    private async sendHeartBeat(): Promise<void> {
        if (!this.isHeartbeatIntervalExceeded()) {
            return;
        }

        const context = acquireSemaphore(this._streamLock, {
            timeout: 0
        });
        try {
            await context.promise;
        } catch {
            return ; // if locked we are already writing
        }

        try {
            await this._executeBeforeStore();
            this._endPreviousCommandIfNeeded();
            if (!BulkInsertOperation._checkServerVersion(this._requestExecutor.lastServerVersion)) {
                return;
            }

            if (!this._first) {
                this._writeComma();
            }

            this._first = false;
            this._inProgressCommand = "None";
            this._writer.write("{\"Type\":\"HeartBeat\"}");

            await this.flushIfNeeded(true);
        } catch {
            //Ignore the heartbeat if failed
        } finally {
            context.dispose();
        }
    }

    private static _checkServerVersion(serverVersion: string): boolean {
        if (serverVersion) {
            const versionParsed = serverVersion.split(".");
            const major = Number.parseInt(versionParsed[0], 10);
            const minor = versionParsed.length > 1 ? Number.parseInt(versionParsed[1]) : 0;
            const build = versionParsed.length> 2 ? Number.parseInt(versionParsed[2]) : 0;
            if (Number.isNaN(major) || Number.isNaN(minor)) {
                return false;
            }

            // version 6 only from 6.0.2
            if (major === 6 && minor > 0) {
                return true;
            }

            if (major === 6 && build < 2) {
                return false;
            }

            // 5.4.108 or higher
            return major > 5 || (major == 5 && minor >= 4 && build >= 110);
        }

        return false;
    }

    public on(event: "progress", handler: (value: BulkInsertOnProgressEventArgs) => void): this {
        this._emitter.on("progress", handler);
        this._onProgressInitialized = true;
        return this;
    }

    public off(event: "progress", handler: (value: BulkInsertOnProgressEventArgs) => void): this {
        this._emitter.off("progress", handler);
        return this;
    }

    get useCompression(): boolean {
        return this._useCompression;
    }

    set useCompression(value: boolean) {
        this._useCompression = value;
    }

    private static _throwNoDatabase(): void {
        throwError("BulkInsertInvalidOperationException", "Cannot start bulk insert operation without specifying a name of a database to operate on."
            + "Database name can be passed as an argument when bulk insert is being created or default database can be defined using 'DocumentStore.setDatabase' method.");
    }

    protected async _waitForId(): Promise<void> {
        if (this._operationId !== -1) {
            return;
        }

        const bulkInsertGetIdRequest = new GetNextOperationIdCommand();
        await this._requestExecutor.execute(bulkInsertGetIdRequest);
        this._operationId = bulkInsertGetIdRequest.result;
        this._nodeTag = bulkInsertGetIdRequest.nodeTag;

        if (this._onProgressInitialized && !this._unsubscribeChanges) {
            const observable = this._store.changes(this._database, this._nodeTag)
                .forOperationId(this._operationId);

            const handler = value => {
                const state = value.state;
                if (state && state.status === "InProgress") {
                    this._emitter.emit("progress", new BulkInsertOnProgressEventArgs(state.progress));
                }
            }

            observable.on("data", handler);

            this._unsubscribeChanges = {
                dispose(): void {
                    observable.off("data", handler)
                }
            };
        }
    }

    private static _typeCheckStoreArgs(
        idOrMetadata?: string | IMetadataDictionary,
        optionalMetadata?: IMetadataDictionary): { id: string, getId: boolean, metadata: IMetadataDictionary } {

        let id: string;
        let metadata;
        let getId = false;

        if (typeof idOrMetadata === "string" || optionalMetadata) {
            id = idOrMetadata as string;
            metadata = optionalMetadata;
        } else {
            metadata = idOrMetadata;
            if (metadata && (CONSTANTS.Documents.Metadata.ID in metadata)) {
                id = metadata[CONSTANTS.Documents.Metadata.ID];
            }
        }

        if (!id) {
            getId = true;
        }

        return { id, metadata, getId };
    }

    /**
     * Synchronous version of store. It stores the entity unless the buffer is full
     * (then false is returned, and you are expected to call await store() ).
     *
     * Usage pattern:
     *
     * ```
     * if (!tryStoreSync(entity, id)) {
     *     await store(entity, id);
     * }
     * ```
     * @param entity Entity
     * @param id Document ID
     */
    public tryStoreSync(entity: object, id: string): boolean;
    public tryStoreSync(entity: object, id: string, metadata: IMetadataDictionary): boolean;
    public tryStoreSync(
        entity: object,
        id: string,
        metadata?: IMetadataDictionary): boolean {

        if (this.isFlushNeeded() || this._first) {
            return false;
        }

        BulkInsertOperation._verifyValidId(id);

        metadata = this.handleMetadata(metadata, entity);

        this._endPreviousCommandIfNeeded();

        this._writeToStream(entity, id, metadata, "PUT");

        return true;
    }

    public async store(entity: object): Promise<void>;
    public async store(entity: object, id: string): Promise<void>;
    public async store(entity: object, metadata: IMetadataDictionary): Promise<void>;
    public async store(entity: object, id: string, metadata: IMetadataDictionary): Promise<void>;
    public async store(
        entity: object,
        idOrMetadata?: string | IMetadataDictionary,
        optionalMetadata?: IMetadataDictionary): Promise<void> {

        const check = await this._concurrencyCheck();
        let id: string;
        try {

            const opts = BulkInsertOperation._typeCheckStoreArgs(idOrMetadata, optionalMetadata);
            let metadata = opts.metadata;

            id = opts.getId ? await this._getId(entity) : opts.id;
            BulkInsertOperation._verifyValidId(id);

            await this._executeBeforeStore();
            metadata = this.handleMetadata(metadata, entity);

            this._endPreviousCommandIfNeeded();

            try {
                this._writeToStream(entity, id, metadata, "PUT");
                await this.flushIfNeeded();
            } catch (e) {   
                this._handleErrors(id, e);
            }
        } finally {
            check.dispose();
        }
    }

    private handleMetadata(metadata: IMetadataDictionary, entity: object) {
        if (!metadata) {
            metadata = new MetadataInternal({});
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
        return metadata;
    }

    // in node.js we handle errors outside of this method
    private _writeToStream(entity: object, id: string, metadata: IMetadataDictionary, type: CommandType) {
        if (this._first) {
            this._first = false;
        } else {
            this._writeComma();
        }

        this._inProgressCommand = "None";

        const documentInfo = new DocumentInfo();
        documentInfo.metadataInstance = metadata;
        let json = EntityToJson.convertEntityToJson(entity, this._conventions, documentInfo, true);

        json = this._conventions.transformObjectKeysToRemoteFieldNameConvention(json);

        this._writer.write(`{"Id":"`);
        this._writeString(id);
        const jsonString = JsonSerializer.getDefault().serialize(json);
        this._writer.write(`","Type":"PUT","Document":${jsonString}}`);
    }

    private _handleErrors(documentId: string, e: Error) {
        if (e.name === "BulkInsertClientException") {
            throw e;
        }
        const error = this._getExceptionFromOperation();
        if (error) {
            throw error;
        }

        throwError("InvalidOperationException", "Bulk insert error, Document Id: " + documentId, e);
    }

    private async _concurrencyCheck(): Promise<IDisposable> {
        if (this._concurrentCheck) {
            throwError("BulkInsertInvalidOperationException", "Bulk Insert store methods cannot be executed concurrently.");
        }
        this._concurrentCheck = 1;

        const context = acquireSemaphore(this._streamLock);
        await context.promise;

        return {
            dispose: () => {
                context.dispose();
                this._concurrentCheck = 0;
            }
        }
    }

    private _endPreviousCommandIfNeeded() {
        if (this._inProgressCommand === "Counters") {
            this._countersOperation.endPreviousCommandIfNeeded();
        } else if (this._inProgressCommand === "TimeSeries") {
            BulkInsertOperation._timeSeriesBulkInsertBaseClass.throwAlreadyRunningTimeSeries();
        }
    }

    private _writeString(input: string): void {
        for (let i = 0; i < input.length; i++) {
            const c = input[i];
            if (`"` === c) {
                if (i === 0 || input[i - 1] !== `\\`) {
                    this._writer.write("\\");
                }
            }

            this._writer.write(c);
        }
    }

    private _writeComma() {
        this._writer.write(",");
    }

    private static _verifyValidId(id: string): void {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("BulkInsertInvalidOperationException", "Document id must have a non empty value." +
                "If you want to store object literals with empty id, please register convention here: store.conventions.findCollectionNameForObjectLiteral");
        }

        if (id.endsWith("|")) {
            throwError("NotSupportedException", "Document ids cannot end with '|', but was called with " + id);
        }
    }

    protected async _getExceptionFromOperation(): Promise<Error> {
        const stateRequest = new GetOperationStateCommand(this._operationId, this._nodeTag);
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

    protected async _ensureStream() {
        const compressionAlgorithm = this._useCompression ? this._conventions.httpCompressionAlgorithm : null;
        await this._writer.ensureStream(compressionAlgorithm);

        const bulkCommand =
            new BulkInsertCommand(this._operationId, compressionAlgorithm, this._writer.compressedStream ?? this._writer.requestBodyStream, this._nodeTag, this._options.skipOverwriteIfUnchanged);

        this._bulkInsertExecuteTask = this._requestExecutor.execute(bulkCommand);
        this._bulkInsertExecuteTask
            .catch(() => this._bulkInsertExecuteTaskErrored = true);
    }

    public async abort(): Promise<void> {
        if (this._operationId !== -1) {
            await this._waitForId();

            try {
                await this._requestExecutor.execute(new KillOperationCommand(this._operationId, this._nodeTag));
            } catch (err) {
                throwError("BulkInsertAbortedException",
                    "Unable to kill bulk insert operation, because it was not found on the server.", err);
            }
        }
    }

    public async finish(): Promise<void> {
        if (this._writer.requestBodyStreamFinished) {
            return;
        }

        this._timer?.dispose(); // in node.js we destroy timer in different place

        this._endPreviousCommandIfNeeded();

        let flushEx: Error;

        try {
            const context = acquireSemaphore(this._streamLock);
            await context.promise;

            try {
                await this._writer.dispose();
            } finally {
                context.dispose();
            }
        } catch (e) {
            flushEx = e;
        }

        if (this._operationId === -1) {
            // closing without calling a single store.
            return;
        }

        if (this._bulkInsertExecuteTask) {
            try {
                await this._bulkInsertExecuteTask;
            } catch (e) {
                await this._throwBulkInsertAborted(e, flushEx)
            }
        }

        if (this._unsubscribeChanges) {
            this._unsubscribeChanges.dispose();
        }
    }

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

    public timeSeriesFor(id: string, name): ITimeSeriesBulkInsert;
    public timeSeriesFor<T extends object>(clazz: EntityConstructor<T>, id: string): ITypedTimeSeriesBulkInsert<T>;
    public timeSeriesFor<T extends object>(clazz: EntityConstructor<T>, id: string, name: string): ITypedTimeSeriesBulkInsert<T>;
    public timeSeriesFor<T extends object>(classOrId: EntityConstructor<T> | string, idOrName: string, name?: string) {
        if (TypeUtil.isString(classOrId)) {
            return this._timeSeriesFor(classOrId, idOrName);
        } else {
            return this._typedTimeSeriesFor(classOrId, idOrName, name);
        }
    }

    private _typedTimeSeriesFor<T extends object>(clazz: EntityConstructor<T>, id: string, name: string = null) {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Document id cannot be null or empty");
        }

        let tsName = name;
        if (!tsName) {
            tsName = TimeSeriesOperations.getTimeSeriesName(clazz, this._conventions);
        }

        BulkInsertOperation._validateTimeSeriesName(tsName);

        return new BulkInsertOperation._typedTimeSeriesBulkInsertClass(this, clazz, id, tsName);
    }


    private _timeSeriesFor(id: string, name: string): ITimeSeriesBulkInsert {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Document id cannot be null or empty");
        }

        BulkInsertOperation._validateTimeSeriesName(name);

        return new BulkInsertOperation._timeSeriesBulkInsertClass(this, id, name);
    }

    private static _validateTimeSeriesName(name: string) {
        if (StringUtil.isNullOrEmpty(name)) {
            throwError("InvalidArgumentException", "Time series name cannot be null or empty");
        }

        if (StringUtil.startsWithIgnoreCase(name, HEADERS.INCREMENTAL_TIME_SERIES_PREFIX) && !name.includes("@")) {
            throwError("InvalidArgumentException", "Time Series name cannot start with " + HEADERS.INCREMENTAL_TIME_SERIES_PREFIX + " prefix");
        }
    }

    private isFlushNeeded(): boolean {
        return this._writer.isFlushNeeded();
    }

    private async flushIfNeeded(force: boolean = false) {
        force = force || this.isHeartbeatIntervalExceeded();

        return this._writer.flushIfNeeded(force);
    }

    private isHeartbeatIntervalExceeded(): boolean {
        return Date.now() - this._writer.lastFlushToStream.getTime() >= this._heartbeatCheckInterval;
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

export interface ITypedTimeSeriesBulkInsert<T extends object> extends IDisposable {
    append(timestamp: Date, value: T): Promise<void>;
    append(timestamp: Date, value: T, tag: string): Promise<void>;
    append(entry: TypedTimeSeriesEntry<T>): Promise<void>;
}

export interface IAttachmentsBulkInsert {
    store(name: string, bytes: Buffer): Promise<void>;
    store(name: string, bytes: Buffer, contentType: string): Promise<void>;
    store(name: string, bytes: Buffer, contentType: string, remoteParameters: RemoteAttachmentParameters): Promise<void>;
}

export class BulkInsertCommand extends RavenCommand<void> {
    public get isReadRequest() {
        return false;
    }

    private readonly _stream: Readable;
    private _skipOverwriteIfUnchanged: boolean;
    private readonly _id: number;
    private _compressionAlgorithm: HttpCompressionAlgorithm;

    public constructor(id: number, compressionAlgorithm: HttpCompressionAlgorithm, stream: Readable, nodeTag: string, skipOverwriteIfUnchanged: boolean) {
        super();

        this._compressionAlgorithm = compressionAlgorithm;
        this._stream = stream;
        this._id = id;
        this._selectedNodeTag = nodeTag;
        this._skipOverwriteIfUnchanged = skipOverwriteIfUnchanged;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url
            + "/databases/" + node.database
            + "/bulk_insert?id=" + this._id
            + "&skipOverwriteIfUnchanged=" + (this._skipOverwriteIfUnchanged ? "true" : "false");

        const headersBuilder = this._headers().typeAppJson();
        if (this._compressionAlgorithm === "Gzip") {
            headersBuilder.with("Content-Encoding", "gzip");
        }

        const headers = headersBuilder.build();
        return {
            method: "POST",
            uri,
            body: this._stream,
            duplex: "half",
            headers
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        return throwError("NotImplementedException", "Not implemented");
    }
}

export interface TimerState {
    parent: BulkInsertOperation;
    timer: Timer;
}
