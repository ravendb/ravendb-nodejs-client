import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { SchemaValidationConfiguration } from "./SchemaValidationConfiguration.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";

export class GetSchemaValidationConfiguration implements IMaintenanceOperation<SchemaValidationConfiguration> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<SchemaValidationConfiguration> {
        return new GetSchemaValidationConfigurationCommand();
    }
}

export class GetSchemaValidationConfigurationCommand extends RavenCommand<SchemaValidationConfiguration> {

    public constructor() {
        super();
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/schema-validation/config`;

        return { uri };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

                let body: string = null;

        this.result = await RavenCommandResponsePipeline.create<SchemaValidationConfiguration>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                paths: [
                    {
                        path: /^validatorsPerCollection$/i,
                        transform: (key: string) => key
                    }
                ]
            })
            .process(bodyStream);

        return body;
    }

    public get isReadRequest() {
        return true;
    }
}
