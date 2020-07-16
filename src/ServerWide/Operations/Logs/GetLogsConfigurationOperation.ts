import { GetLogsConfigurationResult } from "./GetLogsConfigurationResult";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class GetLogsConfigurationOperation implements IServerOperation<GetLogsConfigurationResult> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<GetLogsConfigurationResult> {
        return new GetLogsConfigurationCommand();
    }
}

class GetLogsConfigurationCommand extends RavenCommand<GetLogsConfigurationResult> {
    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/logs/configuration";

        return {
            uri,
            method: "GET"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
