import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { throwError } from "../../../Exceptions/index";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "stream";

export class GetServerWideBackupConfigurationOperation implements IServerOperation<ServerWideBackupConfiguration> {
    private readonly _name: string;

    public constructor(name: string) {
        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ServerWideBackupConfiguration> {
        return new GetServerWideBackupConfigurationCommand(this._name);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class GetServerWideBackupConfigurationCommand extends RavenCommand<ServerWideBackupConfiguration> {
    private readonly _name: string;

    public constructor(name: string) {
        super();
        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/backup?name=" + encodeURIComponent(this._name);

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const result = await this._defaultPipeline(_ => body = _).process(bodyStream);

        const results = result.results as ServerWideBackupConfiguration[];

        if (results.length === 0) {
            return body;
        }

        if (results.length > 1) {
            this._throwInvalidResponse();
        }

        this.result = results[0];

        return body;
    }
}