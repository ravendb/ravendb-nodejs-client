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
import { Readable } from "node:stream";
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

    public async export(options: DatabaseSmugglerExportOptions, toFile: string): Promise<OperationCompletionAwaiter> {
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

    public async import(options: DatabaseSmugglerImportOptions, file: string): Promise<OperationCompletionAwaiter> {
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        if (!file) {
            throwError("InvalidArgumentException", "File cannot be null");
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
    private readonly _file: string;
    private readonly _operationId: number;

    get isReadRequest(): boolean {
        return false;
    }

    public constructor(conventions: DocumentConventions,
                       options: DatabaseSmugglerImportOptions,
                       file: string,
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

        if (body instanceof FormData) {
            const buffer = readFileSync(this._file);
            body.append("name", new Blob([buffer], { type: "text/plain" }));
        }
        return super.send(agent, requestOptions);
    }


    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/smuggler/import?operationId=" + this._operationId;

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
