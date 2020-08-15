import { IDocumentStore } from "../IDocumentStore";
import { StringUtil } from "../../Utility/StringUtil";
import { DatabaseSmugglerImportOptions } from "./DatabaseSmugglerImportOptions";
import { throwError } from "../../Exceptions";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http";
import { DatabaseSmugglerExportOptions } from "./DatabaseSmugglerExportOptions";
import { HttpCache } from "../../Http/HttpCache";
import { HeadersBuilder } from "../../Utility/HttpUtil";
import { DatabaseSmugglerOptions } from "./DatabaseSmugglerOptions";
import * as fs from "fs";
import * as StreamUtil from "../../Utility/StreamUtil";
import { LengthUnawareFormData } from "../../Utility/LengthUnawareFormData";
import * as path from "path";
import { BackupUtils } from "./BackupUtils";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { OperationCompletionAwaiter } from "../Operations/OperationCompletionAwaiter";
import { GetNextOperationIdCommand } from "../Commands/GetNextOperationIdCommand";
import { RavenCommand, ResponseDisposeHandling } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";

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

    public async export(options: DatabaseSmugglerExportOptions, toDatabase: DatabaseSmuggler): Promise<OperationCompletionAwaiter>
    public async export(options: DatabaseSmugglerExportOptions, toFile: string): Promise<OperationCompletionAwaiter>
    public async export(options: DatabaseSmugglerExportOptions, toFileOrToDatabase: string | DatabaseSmuggler): Promise<OperationCompletionAwaiter> {
        if (toFileOrToDatabase instanceof DatabaseSmuggler) {
            const importOptions = new DatabaseSmugglerImportOptions(options);
            return await this._export(options, async response => {
                const importOperation = await toFileOrToDatabase.import(importOptions, response);
                await importOperation.waitForCompletion();
            });
        } else {
            return await this._export(options, async response => {
                const fileStream = fs.createWriteStream(toFileOrToDatabase);
                await StreamUtil.pipelineAsync(response, fileStream);
            });
        }
    }

    private async _export(options: DatabaseSmugglerExportOptions, handleStreamResponse: (stream: NodeJS.ReadableStream) => Promise<void>) {
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        if (!this._requestExecutor) {
            throwError("InvalidOperationException", "Cannot use smuggler without a database defined, did you forget to call 'forDatabase'?");
        }

        const getNextOperationIdCommand = new GetNextOperationIdCommand();
        await this._requestExecutor.execute(getNextOperationIdCommand);

        const operationId = getNextOperationIdCommand.result;

        const command = new ExportCommand(this._requestExecutor.conventions, options, handleStreamResponse, operationId);

        await this._requestExecutor.execute(command);

        return new OperationCompletionAwaiter(this._requestExecutor, this._requestExecutor.conventions, operationId);
    }

    public async importIncremental(options: DatabaseSmugglerImportOptions, fromDirectory: string) {
        const files = fs.readdirSync(fromDirectory)
            .filter(x => BackupUtils.BACKUP_FILE_SUFFIXES.includes("." + path.extname(x)))
            .sort(BackupUtils.comparator);

        if (!files.length) {
            return;
        }

        const oldOperateOnTypes = DatabaseSmuggler.configureOptionsFromIncrementalImport(options);

        for (let i = 0; i < files.length - 1; i++) {
            const filePath = files[i];
            await this.import(options, path.resolve(filePath));
        }

        options.operateOnTypes = oldOperateOnTypes;

        const lastFile = files.slice(-1).pop();
        await this.import(options, path.resolve(lastFile));
    }

    public static configureOptionsFromIncrementalImport(options: DatabaseSmugglerOptions) {
        options.operateOnTypes.push("Tombstones");
        options.operateOnTypes.push("CompareExchangeTombstones");

        // we import the indexes and Subscriptions from the last file only,

        const oldOperateOnTypes = [ ...options.operateOnTypes ];

        options.operateOnTypes = options.operateOnTypes.filter(x => x !== "Indexes" && x !== "Subscriptions");

        return oldOperateOnTypes;
    }

    public async import(options: DatabaseSmugglerImportOptions, fromFile: string): Promise<OperationCompletionAwaiter>
    public async import(options: DatabaseSmugglerImportOptions, stream: NodeJS.ReadableStream): Promise<OperationCompletionAwaiter>
    public async import(options: DatabaseSmugglerImportOptions, fileOrStream: string | NodeJS.ReadableStream): Promise<OperationCompletionAwaiter> {
        if (typeof fileOrStream === "string") {
            let countOfFileParts = 0;

            let result: OperationCompletionAwaiter;
            let fromFile = fileOrStream;

            do {
                const fos = fs.createReadStream(fromFile);

                result = await this._import(options, fos);

                countOfFileParts++;
                fromFile = StringUtil.format("{0}.part{1}", fromFile, countOfFileParts);
            } while (fs.existsSync(fromFile));

            return result;
        } else {
            return await this._import(options, fileOrStream);
        }
    }

    private async _import(options: DatabaseSmugglerImportOptions, stream: NodeJS.ReadableStream): Promise<OperationCompletionAwaiter> {
        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        if (!stream) {
            throwError("InvalidArgumentException", "Stream cannot be null");
        }

        if (!this._requestExecutor) {
            throwError("InvalidOperationException", "Cannot use smuggler without a database defined, did you forget to call 'forDatabase'?");
        }

        const getNextOperationIdCommand = new GetNextOperationIdCommand();
        await this._requestExecutor.execute(getNextOperationIdCommand);

        const operationId = getNextOperationIdCommand.result;

        const command = new ImportCommand(this._requestExecutor.conventions, options, stream, operationId);

        await this._requestExecutor.execute(command);

        return new OperationCompletionAwaiter(this._requestExecutor, this._requestExecutor.conventions, operationId);
    }
}

class ExportCommand extends RavenCommand<void> {
    private readonly _options: object;
    private readonly _handleStreamResponse: (stream: NodeJS.ReadableStream) => Promise<void>;
    private readonly _operationId: number;

    public constructor(conventions: DocumentConventions, options: DatabaseSmugglerExportOptions,
                       handleStreamResponse: (stream: NodeJS.ReadableStream) => Promise<void>, operationId: number) {
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

        const { operateOnTypes, ...restOptions } = options;

        this._options = conventions.objectMapper.toObjectLiteral({
            operateOnTypes: operateOnTypes.join(","),
            ...restOptions
        });
        this._operationId = operationId;
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

    async processResponse(cache: HttpCache, response: HttpResponse, bodyStream: NodeJS.ReadableStream, url: string): Promise<ResponseDisposeHandling> {
        await this._handleStreamResponse(bodyStream);

        return "Automatic";
    }
}

class ImportCommand extends RavenCommand<void> {
    private readonly _options: object;
    private readonly _stream: NodeJS.ReadableStream;
    private readonly _operationId: number;

    get isReadRequest(): boolean {
        return false;
    }

    public constructor(conventions: DocumentConventions, options: DatabaseSmugglerImportOptions, stream: NodeJS.ReadableStream, operationId: number) {
        super();

        this._responseType = "Empty";

        if (!stream) {
            throwError("InvalidArgumentException", "Stream cannot be null");
        }

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!options) {
            throwError("InvalidArgumentException", "Options cannot be null");
        }

        this._stream = stream;

        const { operateOnTypes, ...restOptions } = options;
        this._options = conventions.objectMapper.toObjectLiteral({
            operateOnTypes: operateOnTypes.join(","),
            ...restOptions
        });
        this._operationId = operationId;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/smuggler/import?operationId=" + this._operationId;

        const multipart = new LengthUnawareFormData();
        multipart.append("importOptions", this._serializer.serialize(this._options));
        multipart.append("file", this._stream, { filename: "name" });

        return {
            method: "POST",
            uri,
            body: multipart,
        };
    }

}
