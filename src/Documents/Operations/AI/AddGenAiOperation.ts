import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { GenAiConfiguration } from "./GenAiConfiguration.js";
import { AddGenAiOperationResult } from "./AddAiTaskOperationResult.js";
import { StartingPointChangeVector } from "../../StartingPointChangeVector.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { Stream } from "node:stream";

/**
 * Operation to add a new GenAI ETL task to the database.
 * GenAI ETL monitors a collection, applies AI transformations, and updates documents based on AI responses.
 */
export class AddGenAiOperation implements IMaintenanceOperation<AddGenAiOperationResult> {
    private readonly _configuration: GenAiConfiguration;
    private readonly _startingPoint: StartingPointChangeVector;

    /**
     * Creates a new AddGenAiOperation.
     * @param configuration The GenAI ETL configuration
     * @param startingPoint Where the ETL should start processing documents (default: LastDocument)
     */
    public constructor(
        configuration: GenAiConfiguration,
        startingPoint: StartingPointChangeVector = StartingPointChangeVector.LastDocument
    ) {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._configuration = configuration;
        this._startingPoint = startingPoint;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<AddGenAiOperationResult> {
        return new AddGenAiCommand(conventions, this._configuration, this._startingPoint);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class AddGenAiCommand extends RavenCommand<AddGenAiOperationResult> implements IRaftCommand {
    private readonly _conventions: DocumentConventions;
    private readonly _configuration: GenAiConfiguration;
    private readonly _startingPoint: StartingPointChangeVector;

    public constructor(
        conventions: DocumentConventions,
        configuration: GenAiConfiguration,
        startingPoint: StartingPointChangeVector
    ) {
        super();

        if (!conventions) {
            throw new Error("Conventions cannot be null");
        }
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._conventions = conventions;
        this._configuration = configuration;
        this._startingPoint = startingPoint;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/etl?changeVector=${encodeURIComponent(this._startingPoint.value)}`;

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

