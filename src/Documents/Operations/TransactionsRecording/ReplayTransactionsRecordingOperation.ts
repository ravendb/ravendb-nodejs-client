import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { IOperationResult } from "../IOperationResult.js";
import { HttpRequestParameters, HttpResponse } from "../../../Primitives/Http.js";
import { Readable, Stream } from "node:stream";
import { Dispatcher } from "undici-types";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { throwError } from "../../../Exceptions/index.js";
import { readToBuffer } from "../../../Utility/StreamUtil.js";

export interface ReplayTxOperationResult extends IOperationResult {
    executedCommandsAmount: number;
}

/**
 * Replays a transactions recording made with StartTransactionsRecordingOperation.
 * Get the operation id from GetNextOperationIdCommand; KillOperationCommand with it stops the replay.
 */
export class ReplayTransactionsRecordingOperation implements IMaintenanceOperation<ReplayTxOperationResult> {
    private readonly _replayData: Buffer | Readable;
    private readonly _operationId: number;

    public constructor(replayData: Buffer | Readable, operationId: number) {
        if (!replayData) {
            throwError("InvalidArgumentException", "ReplayData cannot be null");
        }
        this._replayData = replayData;
        this._operationId = operationId;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ReplayTxOperationResult> {
        return new ReplayTransactionsRecordingCommand(this._replayData, this._operationId);
    }
}

class ReplayTransactionsRecordingCommand extends RavenCommand<ReplayTxOperationResult> {
    private _replayData: Buffer | Readable;
    private readonly _operationId: number;

    public constructor(replayData: Buffer | Readable, operationId: number) {
        super();
        this._replayData = replayData;
        this._operationId = operationId;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/databases/" + node.database + "/transactions/replay?operationId=" + this._operationId,
            method: "POST",
            // the file is appended in send(); the request executor picks Accept-Encoding by body type, and fetch cannot decode zstd
            body: new FormData()
        };
    }

    public async send(agent: Dispatcher, requestOptions: HttpRequestParameters): Promise<{
        response: HttpResponse;
        bodyStream: Readable
    }> {
        if (!Buffer.isBuffer(this._replayData)) {
            this._replayData = await readToBuffer(this._replayData);
        }

        (requestOptions.body as FormData).append("file", new Blob([this._replayData as Buffer]), "name");
        return super.send(agent, requestOptions);
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
