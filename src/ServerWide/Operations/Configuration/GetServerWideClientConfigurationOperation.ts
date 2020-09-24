import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { ClientConfiguration } from "../../../Documents/Operations/Configuration/ClientConfiguration";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { ServerNode } from "../../../Http/ServerNode";

export class GetServerWideClientConfigurationOperation implements IServerOperation<ClientConfiguration> {
    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ClientConfiguration> {
        return new GetServerWideClientConfigurationCommand();
    }
}

class GetServerWideClientConfigurationCommand extends RavenCommand<ClientConfiguration> {

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/configuration/client";

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