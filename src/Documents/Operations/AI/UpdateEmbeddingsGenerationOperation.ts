import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { EmbeddingsGenerationConfiguration } from "./EmbeddingsGenerationConfiguration.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { Stream } from "node:stream";
import { throwError } from "../../../Exceptions/index.js";

export interface UpdateEmbeddingsGenerationOperationResult {
    raftCommandIndex: number;
    taskId: number;
}

/**
 * Operation to update an existing Embeddings Generation ETL task.
 */
export class UpdateEmbeddingsGenerationOperation implements IMaintenanceOperation<UpdateEmbeddingsGenerationOperationResult> {
    private readonly _taskId: number;
    private readonly _configuration: EmbeddingsGenerationConfiguration;

    /**
     * Creates a new UpdateEmbeddingsGenerationOperation.
     * @param taskId The ID of the task to update
     * @param configuration The updated Embeddings Generation ETL configuration
     */
    public constructor(
        taskId: number,
        configuration: EmbeddingsGenerationConfiguration
    ) {
        if (!configuration) {
            throwError("ArgumentNullException", "Configuration cannot be null");
        }

        this._taskId = taskId;
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<UpdateEmbeddingsGenerationOperationResult> {
        return new UpdateEmbeddingsGenerationCommand(
            conventions,
            this._taskId,
            this._configuration
        );
    }
}

class UpdateEmbeddingsGenerationCommand extends RavenCommand<UpdateEmbeddingsGenerationOperationResult> implements IRaftCommand {
    private readonly _conventions: DocumentConventions;
    private readonly _taskId: number;
    private readonly _configuration: EmbeddingsGenerationConfiguration;

    public constructor(
        conventions: DocumentConventions,
        taskId: number,
        configuration: EmbeddingsGenerationConfiguration
    ) {
        super();

        if (!conventions) {
            throwError("ArgumentNullException", "Conventions cannot be null");
        }
        if (!configuration) {
            throwError("ArgumentNullException", "Configuration cannot be null");
        }

        this._conventions = conventions;
        this._taskId = taskId;
        this._configuration = configuration;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/etl?id=${this._taskId}`;

        const body = JSON.stringify(this._configuration.serialize(this._conventions));
        const headers = this._headers().typeAppJson().build();

        return {
            uri,
            method: "PUT",
            body,
            headers
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

