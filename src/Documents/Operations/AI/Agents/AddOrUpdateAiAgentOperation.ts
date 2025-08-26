import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { AiAgentConfiguration } from "./config/AiAgentConfiguration.js";
import type { AiAgentConfigurationResult } from "./AiAgentConfigurationResult.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../../Exceptions/index.js";
import { HeadersBuilder } from "../../../../Utility/HttpUtil.js";

function hasNoSampleObjectOrSchema(configuration: AiAgentConfiguration) {
    return (!configuration.outputSchema || configuration.outputSchema.trim() === "")
        && (!configuration.sampleObject || configuration.sampleObject.trim() === "");
}

export class AddOrUpdateAiAgentOperation implements IMaintenanceOperation<AiAgentConfigurationResult> {
    private readonly _configuration: AiAgentConfiguration;
    private readonly _sampleObject?: unknown;

    public constructor(configuration: AiAgentConfiguration, schemaType?: any) {
        if (!configuration) {
            throwError("InvalidArgumentException", "configuration cannot be null or undefined.");
        }

        if (!configuration.outputSchema && !configuration.sampleObject && !schemaType) {
            throwError("InvalidArgumentException", "Please provide a non-empty value for either outputSchema or sampleObject.");
        }
        this._configuration = configuration;
        if (schemaType) {
            this._sampleObject = schemaType;
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<AiAgentConfigurationResult> {
        return new AddOrUpdateAiAgentCommand(this._configuration, this._sampleObject, conventions);
    }
}


class AddOrUpdateAiAgentCommand extends RavenCommand<AiAgentConfigurationResult> implements IRaftCommand {
    private readonly _configuration: AiAgentConfiguration;
    private readonly _conventions: DocumentConventions;
    private readonly _sampleSchema?: any;

    public constructor(configuration: AiAgentConfiguration, sampleSchema: any, conventions: DocumentConventions) {
        super();
        if (hasNoSampleObjectOrSchema(configuration)) {
            throwError("InvalidArgumentException", "Please provide a non-empty value for either outputSchema or sampleObject.");
        }
        this._configuration = configuration;
        this._sampleSchema = sampleSchema;
        this._conventions = conventions;
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/ai/agent";

        if (!this._configuration && this._sampleSchema) {
            this._configuration.sampleObject = this._sampleSchema;
        }

        const body = this._serializer.serialize(this._configuration);

        const headers = HeadersBuilder
            .create()
            .typeAppJson()
            .build();

        return {
            method: "PUT",
            uri,
            body,
            headers
        } as HttpRequestParameters;
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }
        let body = "";
        const data = await this._defaultPipeline<any>(_ => body = _).process(bodyStream);
        this.result = {
            identifier: data?.Identifier ?? data?.identifier,
            raftCommandIndex: data?.RaftCommandIndex ?? data?.raftCommandIndex
        } as AiAgentConfigurationResult;
        return body;
    }
}
