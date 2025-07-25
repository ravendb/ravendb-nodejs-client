import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { JsonSerializer } from "../../../../Mapping/Json/Serializer.js";
import { HeadersBuilder } from "../../../../Utility/HttpUtil.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { throwError } from "../../../../Exceptions/index.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { AiAgentConfiguration } from "./AiAgentConfiguration.js";
import { AiAgentConfigurationResult } from "./AiAgentConfigurationResult.js";

export class AddOrUpdateAiAgentOperation implements IMaintenanceOperation<AiAgentConfigurationResult> {
    private readonly _configuration: AiAgentConfiguration;
    private readonly _sampleSchema?: any;

    public constructor(configuration: AiAgentConfiguration);
    public constructor(configuration: AiAgentConfiguration, schemaType?: { new(): any });
    public constructor(configuration: AiAgentConfiguration, schemaType?: { new(): any }) {
        if (!configuration) {
            throwError("InvalidArgumentException", "configuration cannot be null");
        }

        if (!configuration.outputSchema && !configuration.sampleObject && !schemaType) {
            throwError("InvalidArgumentException", "Please provide a non-empty value for either outputSchema or sampleObject or schemaType");
        }

        this._configuration = configuration;
        if (schemaType) {
            this._sampleSchema = new schemaType();
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<AiAgentConfigurationResult> {
        return new AddOrUpdateAiAgentCommand(this._configuration, this._sampleSchema, conventions);
    }
}

export class AddOrUpdateAiAgentCommand extends RavenCommand<AiAgentConfigurationResult> implements IRaftCommand {
    private readonly _configuration: AiAgentConfiguration;
    private readonly _sampleSchema?: any;
    private readonly _conventions: DocumentConventions;

    public constructor(configuration: AiAgentConfiguration, sampleSchema: any, conventions: DocumentConventions) {
        super();
        this._configuration = configuration;
        this._sampleSchema = sampleSchema;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/ai/agent`;

        // Create a copy of the configuration to avoid modifying the original
        const configToSend = { ...this._configuration };

        // Set sample object if not provided but we have a schema type
        if (!configToSend.sampleObject && this._sampleSchema) {
            configToSend.sampleObject = JSON.stringify(this._sampleSchema);
        }

        // Convert Set to Array for JSON serialization
        const bodyToSerialize = {
            ...configToSend,
            parameters: configToSend.parameters ? Array.from(configToSend.parameters) : []
        };

        const bodyJson = ObjectUtil.transformObjectKeys(bodyToSerialize, {
            defaultTransform: ObjectUtil.pascal
        });

        const body = JsonSerializer.getDefault().serialize(bodyJson);

        const headers = HeadersBuilder
            .create()
            .typeAppJson()
            .build();

        return {
            method: "PUT",
            uri,
            body,
            headers
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return "";
        }

        let body: string = "";
        const result = await this._defaultPipeline()
            .collectBody(b => body = b)
            .process(bodyStream);

        this.result = result as AiAgentConfigurationResult;
        return body;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
