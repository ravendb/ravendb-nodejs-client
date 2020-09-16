import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class StartTransactionsRecordingOperation implements IMaintenanceOperation<void> {
    private readonly _filePath: string;

    public constructor(filePath: string) {
        this._filePath = filePath;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new StartTransactionsRecordingCommand(this._filePath);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class StartTransactionsRecordingCommand extends RavenCommand<void> {
    private readonly _filePath: string;

    public constructor(filePath: string) {
        super();

        this._filePath = filePath;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/transactions/start-recording";

        const body = this._serializer.serialize({
            File: this._filePath
        });

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}