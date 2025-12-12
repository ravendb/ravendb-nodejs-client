import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { GenAiConfiguration } from "./GenAiConfiguration.js";
import { StartingPointChangeVector } from "../../StartingPointChangeVector.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { Stream } from "node:stream";

export interface UpdateEtlOperationResult {
    raftCommandIndex: number;
    taskId: number;
}

/**
 * Operation to update an existing GenAI ETL task.
 * Allows modifying the configuration and optionally resetting the transformation state.
 */
export class UpdateGenAiOperation implements IMaintenanceOperation<UpdateEtlOperationResult> {
    private readonly _taskId: number;
    private readonly _configuration: GenAiConfiguration;
    private readonly _startingPoint: StartingPointChangeVector;
    private readonly _reset: boolean;

    /**
     * Creates a new UpdateGenAiOperation.
     * @param taskId The ID of the task to update
     * @param configuration The updated GenAI ETL configuration
     * @param startingPoint Where the ETL should start processing documents (default: DoNotChange)
     * @param reset Whether to reset the transformation state (default: false)
     */
    public constructor(
        taskId: number,
        configuration: GenAiConfiguration,
        startingPoint: StartingPointChangeVector = StartingPointChangeVector.DoNotChange,
        reset: boolean = false
    ) {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._taskId = taskId;
        this._configuration = configuration;
        this._startingPoint = startingPoint;
        this._reset = reset;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<UpdateEtlOperationResult> {
        return new UpdateGenAiCommand(
            conventions,
            this._taskId,
            this._configuration,
            this._startingPoint,
            this._reset
        );
    }
}

class UpdateGenAiCommand extends RavenCommand<UpdateEtlOperationResult> implements IRaftCommand {
    private readonly _conventions: DocumentConventions;
    private readonly _taskId: number;
    private readonly _configuration: GenAiConfiguration;
    private readonly _startingPoint: StartingPointChangeVector;
    private readonly _transformationsToReset: string[] | null;

    public constructor(
        conventions: DocumentConventions,
        taskId: number,
        configuration: GenAiConfiguration,
        startingPoint: StartingPointChangeVector,
        reset: boolean
    ) {
        super();

        if (!conventions) {
            throw new Error("Conventions cannot be null");
        }
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._conventions = conventions;
        this._taskId = taskId;
        this._configuration = configuration;
        this._startingPoint = startingPoint;

        // If reset is true, reset the single GenAI transformation
        this._transformationsToReset = reset ? ["GenAi-transform-script"] : null;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/etl?id=${this._taskId}&changeVector=${encodeURIComponent(this._startingPoint.value)}`;

        const configJson = this._configuration.serialize(this._conventions) as any;

        if (this._transformationsToReset) {
            configJson.TransformationsToReset = this._transformationsToReset;
        }

        const body = JSON.stringify(configJson);
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

