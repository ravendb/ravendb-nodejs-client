import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { RemoteAttachmentsConfiguration } from "../../../Attachments/RemoteAttachmentsConfiguration.js";
import { ConfigureRemoteAttachmentsOperationResult } from "./ConfigureRemoteAttachmentsOperationResult.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../../Exceptions/index.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";
import { JsonSerializer } from "../../../../Mapping/Json/Serializer.js";

/**
 * Operation to configure remote attachments for a database.
 *
 * This operation allows you to configure cloud storage destinations (S3 or Azure Blob Storage)
 * where attachments can be automatically uploaded and stored, reducing local database size.
 */
export class ConfigureRemoteAttachmentsOperation implements IMaintenanceOperation<ConfigureRemoteAttachmentsOperationResult> {
    private readonly _configuration: RemoteAttachmentsConfiguration;

    /**
     * Creates a new ConfigureRemoteAttachmentsOperation.
     * @param configuration The remote attachments configuration to apply
     * @throws Error if configuration is null or invalid
     */
    public constructor(configuration: RemoteAttachmentsConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        configuration.assertConfiguration();
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureRemoteAttachmentsOperationResult> {
        return new ConfigureRemoteAttachmentsCommand(this._configuration);
    }
}

class ConfigureRemoteAttachmentsCommand extends RavenCommand<ConfigureRemoteAttachmentsOperationResult> implements IRaftCommand {
    private readonly _configuration: RemoteAttachmentsConfiguration;

    public constructor(configuration: RemoteAttachmentsConfiguration) {
        super();

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/attachments/remote/config";

        const serialized = ObjectUtil.transformObjectKeys(this._configuration, {
            defaultTransform: ObjectUtil.pascalCase,
            paths: [
                    {
                        path: /^destinations$/i,
                        transform: (key: string) => key
                    }
                ]
        })

        return {
            uri,
            method: "PUT",
            headers: this._headers().typeAppJson().build(),
            body: JsonSerializer.getDefault().serialize(serialized)
        }
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
