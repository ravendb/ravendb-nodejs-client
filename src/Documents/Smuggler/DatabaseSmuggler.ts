import { IDocumentStore } from "../IDocumentStore.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { DatabaseSmugglerImportOptions } from "./DatabaseSmugglerImportOptions.js";
import { throwError } from "../../Exceptions/index.js";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http.js";
import { DatabaseSmugglerExportOptions } from "./DatabaseSmugglerExportOptions.js";
import { HttpCache } from "../../Http/HttpCache.js";
import { HeadersBuilder } from "../../Utility/HttpUtil.js";
import { DatabaseSmugglerOptions } from "./DatabaseSmugglerOptions.js";
import { DatabaseRecordItemType } from "./DatabaseRecordItemType.js";
import { pipelineAsync } from "../../Utility/StreamUtil.js";
import { dirname, resolve, extname } from "node:path";
import { BackupUtils } from "./BackupUtils.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { OperationCompletionAwaiter } from "../Operations/OperationCompletionAwaiter.js";
import { GetNextOperationIdCommand } from "../Commands/GetNextOperationIdCommand.js";
import { RavenCommand, ResponseDisposeHandling } from "../../Http/RavenCommand.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { Readable, Writable } from "node:stream";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { Dispatcher } from "undici-types";

export class DatabaseSmuggler {
    private readonly _store: IDocumentStore;
    private readonly _databaseName: string;
    private readonly _requestExecutor: RequestExecutor;

    public constructor(store: IDocumentStore)
    public constructor(store: IDocumentStore, databaseName: string)
    public constructor(store: IDocumentStore, databaseName?: string) {
        this._store = store;
        this._databaseName = databaseName ?? store.database;
        if (this._databaseName) {
            this._requestExecutor = store.getRequestExecutor(this._databaseName);
        } else {
            this._requestExecutor = null;
        }
    }

    public forDatabase(databaseName: string): DatabaseSmuggler {
        if (StringUtil.equalsIgnoreCase(databaseName, this._databaseName)) {
            return this;
        }

        return new DatabaseSmuggler(this._store, databaseName);
    }

    public export(options: DatabaseSmugglerExportOptions, toFile: string): Promise<OperationCompletionAwaiter>;
    /**
     * Writes the export to the stream and leaves it open.
     */
    public export(options: DatabaseSmugglerExportOptions, toStream: Writable): Promise<OperationCompletionAwaiter>;
    /**
     * Streams the export straight into another database and returns the import operation.
     */
    public export(options: DatabaseSmugglerExportOptions, toDatabase: DatabaseSmuggler): Promise<OperationCompletionAwaiter>;
    public async export(options: DatabaseSmugglerExportOptions,
                        target: string | Writable | DatabaseSmuggler): Promise<OperationCompletionAwaiter> {
        if (target instanceof DatabaseSmuggler) {
            return this._exportToDatabase(options, target);
        }

        if (typeof target !== "string") {
            return this._exportToStream(options, target);
        }

        const toFile = target;
        const directory = dirname(resolve(toFile));
        const { existsSync, mkdirSync , createWriteStream} = await import("node:fs");
        if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
        }

        return await this._export(options, async response => {
            const fileStream = createWriteStream(toFile);
            await pipelineAsync(response, fileStream);
        });

    }

    private async _exportToStream(options: DatabaseSmugglerExportOptions, toStream: Writable): Promise<OperationCompletionAwaiter> {
        if (!toStream) {
            throwError("InvalidArgumentException", "Stream cannot be null");
        }

        return this._export(options, async response => {
            for await (const chunk of response) {
                if (!toStream.write(chunk)) {
                    await once(toStream, "drain");
                }
            }
        });
    }

    private async _exportToDatabase(options: DatabaseSmugglerExportOptions, toDatabase: DatabaseSmuggler): Promise<OperationCompletionAwaiter> {
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        if (!toDatabase) {
            throwError("InvalidArgumentException", "ToDatabase cannot be null");
        }

        const importOptions = new DatabaseSmugglerImportOptions(options);
        let importOperation: OperationCompletionAwaiter;

        await this._export(options, async response => {
            importOperation = await toDatabase.import(importOptions, response);
        });

        return importOperation;
    }

    private async _export(options: DatabaseSmugglerExportOptions, handleStreamResponse: (stream: Readable) => Promise<void>) {
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        if (!this._requestExecutor) {
            throwError("InvalidOperationException", "Cannot use smuggler without a database defined, did you forget to call 'forDatabase'?");
        }

        const getOperationIdCommand = new GetNextOperationIdCommand();
        await this._requestExecutor.execute(getOperationIdCommand);

        const operationId = getOperationIdCommand.result;

        const command = new ExportCommand(this._requestExecutor.conventions, options, handleStreamResponse, operationId, getOperationIdCommand.nodeTag);

        await this._requestExecutor.execute(command);

        return new OperationCompletionAwaiter(this._requestExecutor, this._requestExecutor.conventions, operationId, getOperationIdCommand.nodeTag);
    }

    public async importIncremental(options: DatabaseSmugglerImportOptions, fromDirectory: string) {
        const { statSync, readdirSync } = await import("node:fs");
        const mProvider = f => statSync(f).mtimeMs;
        const files = readdirSync(fromDirectory)
            .filter(x => BackupUtils.BACKUP_FILE_SUFFIXES.includes("." + extname(x)))
            .sort((a, b) => BackupUtils.comparator(a, b, mProvider));

        if (!files.length) {
            return;
        }

        const oldOperateOnTypes = DatabaseSmuggler.configureOptionsFromIncrementalImport(options);

        for (let i = 0; i < files.length - 1; i++) {
            const filePath = files[i];
            await this.import(options, resolve(filePath));
        }

        options.operateOnTypes = oldOperateOnTypes;

        const lastFile = files.at(-1);
        await this.import(options, resolve(lastFile));
    }

    public static configureOptionsFromIncrementalImport(options: DatabaseSmugglerOptions) {
        options.operateOnTypes.push("Tombstones");
        options.operateOnTypes.push("CompareExchangeTombstones");

        // we import the indexes and Subscriptions from the last file only,

        const oldOperateOnTypes = [ ...options.operateOnTypes ];

        options.operateOnTypes = options.operateOnTypes.filter(x => x !== "Indexes" && x !== "Subscriptions");

        return oldOperateOnTypes;
    }

    public import(options: DatabaseSmugglerImportOptions, file: string): Promise<OperationCompletionAwaiter>;
    /**
     * Imports from the stream without buffering it. The stream is read to its end but not closed.
     */
    public import(options: DatabaseSmugglerImportOptions, stream: Readable): Promise<OperationCompletionAwaiter>;
    public async import(options: DatabaseSmugglerImportOptions, file: string | Readable): Promise<OperationCompletionAwaiter> {
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        if (!file) {
            throwError("InvalidArgumentException", typeof file === "string" ? "File cannot be null" : "Stream cannot be null");
        }

        if (!this._requestExecutor) {
            throwError("InvalidOperationException", "Cannot use smuggler without a database defined, did you forget to call 'forDatabase'?");
        }

        const getOperationIdCommand = new GetNextOperationIdCommand();
        await this._requestExecutor.execute(getOperationIdCommand);

        const operationId = getOperationIdCommand.result;

        const command = new ImportCommand(this._requestExecutor.conventions, options, file, operationId, getOperationIdCommand.nodeTag);

        await this._requestExecutor.execute(command);

        return new OperationCompletionAwaiter(this._requestExecutor, this._requestExecutor.conventions, operationId, getOperationIdCommand.nodeTag);
    }
}

const SERVER_DATABASE_RECORD_ITEM_TYPES: Partial<Record<DatabaseRecordItemType, DatabaseRecordItemType>> = {
    QueueEtl: "QueueEtls",
    PostgreSqlIntegration: "PostgreSQLIntegration"
};

function serializeOptions(conventions: DocumentConventions, options: DatabaseSmugglerOptions): object {
    const { operateOnTypes, operateOnDatabaseRecordTypes, operateOnDatabaseRecordType, ...restOptions } = options;
    const recordTypes = operateOnDatabaseRecordType ?? operateOnDatabaseRecordTypes;

    return conventions.objectMapper.toObjectLiteral({
        operateOnTypes: operateOnTypes.join(","),
        operateOnDatabaseRecordTypes: toServerFlags(recordTypes),
        ...restOptions
    });
}

function toServerFlags(recordTypes: DatabaseRecordItemType[]): string {
    // the server applies its own default, older servers reject record types they do not know
    if (!recordTypes || isDefaultSelection(recordTypes)) {
        return undefined;
    }

    if (!recordTypes.length) {
        return "None";
    }

    return recordTypes.map(x => SERVER_DATABASE_RECORD_ITEM_TYPES[x] ?? x).join(",");
}

function isDefaultSelection(recordTypes: DatabaseRecordItemType[]): boolean {
    const defaults = DatabaseSmugglerOptions.DEFAULT_OPERATE_ON_DATABASE_RECORD_TYPES;
    return recordTypes.length === defaults.length && defaults.every(x => recordTypes.includes(x));
}

class ExportCommand extends RavenCommand<void> {
    private readonly _options: object;
    private readonly _handleStreamResponse: (stream: Readable) => Promise<void>;
    private readonly _operationId: number;

    public constructor(conventions: DocumentConventions, options: DatabaseSmugglerExportOptions,
                       handleStreamResponse: (stream: Readable) => Promise<void>, operationId: number, nodeTag: string) {
        super();
        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }
        if (!handleStreamResponse) {
            throwError("InvalidArgumentException", "HandleStreamResponse cannot be null");
        }

        this._handleStreamResponse = handleStreamResponse;

        this._options = serializeOptions(conventions, options);
        this._operationId = operationId;
        this._selectedNodeTag = nodeTag;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/smuggler/export?operationId=" + this._operationId;

        const body = this._serializer.serialize(this._options);

        const headers = HeadersBuilder.create()
            .typeAppJson().build();

        return {
            method: "POST",
            uri,
            body,
            headers
        };
    }

    async processResponse(cache: HttpCache, response: HttpResponse, bodyStream: Readable, url: string): Promise<ResponseDisposeHandling> {
        await this._handleStreamResponse(bodyStream);

        return "Automatic";
    }
}

class ImportCommand extends RavenCommand<void> {
    private readonly _options: object;
    private readonly _file: string | Readable;
    private readonly _operationId: number;

    get isReadRequest(): boolean {
        return false;
    }

    public constructor(conventions: DocumentConventions,
                       options: DatabaseSmugglerImportOptions,
                       file: string | Readable,
                       operationId: number,
                       nodeTag: string) {
        super();

        this._responseType = "Empty";

        if (!file) {
            throwError("InvalidArgumentException", "File cannot be null");
        }

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        this._file = file;

        this._options = serializeOptions(conventions, options);
        this._operationId = operationId;
        this._selectedNodeTag = nodeTag;
    }

    async send(agent: Dispatcher, requestOptions: HttpRequestParameters): Promise<{
        response: HttpResponse;
        bodyStream: Readable
    }> {
        const { body } = requestOptions;

        const { readFileSync } = await import("node:fs");

        if (body instanceof FormData && typeof this._file === "string") {
            const buffer = readFileSync(this._file);
            body.append("name", new Blob([buffer], { type: "text/plain" }));
        }
        return super.send(agent, requestOptions);
    }


    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/smuggler/import?operationId=" + this._operationId;

        if (typeof this._file !== "string") {
            const boundary = "RavenDB-" + randomUUID();
            return {
                method: "POST",
                uri,
                body: Readable.from(streamMultipart(boundary, this._serializer.serialize(this._options), this._file)),
                duplex: "half",
                headers: HeadersBuilder.create().with("content-type", "multipart/form-data; boundary=" + boundary).build()
            };
        }

        const multipart = new FormData();
        multipart.append("importOptions", this._serializer.serialize(this._options));
        // we append file in send method

        return {
            method: "POST",
            uri,
            body: multipart,
        };
    }

}

async function* streamMultipart(boundary: string, importOptions: string, file: Readable): AsyncGenerator<Buffer> {
    const lineBreak = "\r\n";

    yield Buffer.from(`--${boundary}${lineBreak}`
        + `Content-Disposition: form-data; name="importOptions"${lineBreak}${lineBreak}`
        + `${importOptions}${lineBreak}`);

    yield Buffer.from(`--${boundary}${lineBreak}`
        + `Content-Disposition: form-data; name="file"; filename="name"${lineBreak}`
        + `Content-Type: application/octet-stream${lineBreak}${lineBreak}`);

    for await (const chunk of file) {
        yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }

    yield Buffer.from(`${lineBreak}--${boundary}--${lineBreak}`);
}
