import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { SchemaValidationConfiguration } from "./SchemaValidationConfiguration.js";
import { ConfigureSchemaValidationOperationResult } from "./ConfigureSchemaValidationOperationResult.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../Exceptions/index.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { JsonSerializer } from "../../../Mapping/Json/Serializer.js";

export class ConfigureSchemaValidationOperation implements IMaintenanceOperation<ConfigureSchemaValidationOperationResult> {
    private readonly _configuration: SchemaValidationConfiguration;

    public constructor(configuration: SchemaValidationConfiguration) {
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureSchemaValidationOperationResult> {
        return new ConfigureSchemaValidationCommand(this._configuration);
    }
}

class ConfigureSchemaValidationCommand extends RavenCommand<ConfigureSchemaValidationOperationResult> implements IRaftCommand {
    private readonly _configuration: SchemaValidationConfiguration;

    public constructor(configuration: SchemaValidationConfiguration) {
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
        const uri = node.url + "/databases/" + node.database + "/admin/schema-validation/config";

        const serialized = ObjectUtil.transformObjectKeys(this._configuration, {
            defaultTransform: ObjectUtil.pascalCase,
            paths: [
                {
                    path: /^validatorsPerCollection$/i,
                    transform: (key: string) => key
                }
            ]
        });

        return {
            uri,
            method: "POST",
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
