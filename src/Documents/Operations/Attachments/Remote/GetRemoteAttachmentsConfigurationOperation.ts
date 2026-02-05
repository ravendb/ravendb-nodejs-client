import { Stream } from "node:stream";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { RemoteAttachmentsConfiguration } from "../../../Attachments/RemoteAttachmentsConfiguration.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { RavenCommandResponsePipeline } from "../../../../Http/RavenCommandResponsePipeline.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";

/**
 * Operation to retrieve the current remote attachments configuration for a database.
 */
export class GetRemoteAttachmentsConfigurationOperation implements IMaintenanceOperation<RemoteAttachmentsConfiguration> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<RemoteAttachmentsConfiguration> {
        return new GetRemoteAttachmentsConfigurationCommand();
    }
}

class GetRemoteAttachmentsConfigurationCommand extends RavenCommand<RemoteAttachmentsConfiguration> {

    constructor() {
        super();
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/attachments/remote/config`;
        return { uri, method: "GET" };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;

        this.result = await RavenCommandResponsePipeline.create<RemoteAttachmentsConfiguration>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                paths: [
                    {
                        // Match destination keys (direct children of "destinations")
                        // This regex matches paths like "destinations.S3-Users", "destinations.s3-backup", etc.
                        path: /^destinations$/i,
                        // Identity transform - return the key as-is
                        transform: (key: string) => key
                    }
                ]
            })
            .process(bodyStream);

        return body;
    }
}
