import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { ServerWideBackupConfiguration } from "./ServerWideBackupConfiguration";

export class GetServerWideBackupConfigurationsOperation implements IServerOperation<ServerWideBackupConfiguration[]> {
    getCommand(conventions: DocumentConventions): RavenCommand<ServerWideBackupConfiguration[]> {
        return new GetServerWideBackupConfigurationsCommand();
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class GetServerWideBackupConfigurationsCommand extends RavenCommand<ServerWideBackupConfiguration[]> {
    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/backup";

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        const result = await this._defaultPipeline(_ => body = _).process(bodyStream);

        this.result = result["results"] as ServerWideBackupConfiguration[];

        return body;
    }
}
