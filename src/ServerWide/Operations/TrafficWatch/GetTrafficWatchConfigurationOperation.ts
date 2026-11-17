import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { PutTrafficWatchConfigurationParameters } from "./PutTrafficWatchConfigurationOperation.js";

export class GetTrafficWatchConfigurationOperation implements IServerOperation<PutTrafficWatchConfigurationParameters> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<PutTrafficWatchConfigurationParameters> {
        return new GetTrafficWatchConfigurationCommand();
    }
}

class GetTrafficWatchConfigurationCommand extends RavenCommand<PutTrafficWatchConfigurationParameters> {
    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/admin/traffic-watch/configuration",
            method: "GET"
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
