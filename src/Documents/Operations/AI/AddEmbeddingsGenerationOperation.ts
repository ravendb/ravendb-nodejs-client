import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { EmbeddingsGenerationConfiguration } from "./EmbeddingsGenerationConfiguration.js";
import { AddEmbeddingsGenerationOperationResult } from "./AddEmbeddingsGenerationOperationResult.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { Stream } from "node:stream";
import { throwError } from "../../../Exceptions/index.js";

/**
 * Operation to add a new Embeddings Generation ETL task to the database.
 * Embeddings Generation ETL monitors a collection and automatically generates vector embeddings
 * for specified document fields.
 */
export class AddEmbeddingsGenerationOperation implements IMaintenanceOperation<AddEmbeddingsGenerationOperationResult> {
    private readonly _configuration: EmbeddingsGenerationConfiguration;

    /**
     * Creates a new AddEmbeddingsGenerationOperation.
     * @param configuration The Embeddings Generation ETL configuration
     */
    public constructor(
        configuration: EmbeddingsGenerationConfiguration
    ) {
        if (!configuration) {
            throwError("ArgumentNullException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<AddEmbeddingsGenerationOperationResult> {
        return new AddEmbeddingsGenerationCommand(conventions, this._configuration);
    }
}

class AddEmbeddingsGenerationCommand extends RavenCommand<AddEmbeddingsGenerationOperationResult> implements IRaftCommand {
    private readonly _conventions: DocumentConventions;
    private readonly _configuration: EmbeddingsGenerationConfiguration;

    public constructor(
        conventions: DocumentConventions,
        configuration: EmbeddingsGenerationConfiguration,
    ) {
        super();

        if (!conventions) {
            throwError("ArgumentNullException", "Conventions cannot be null");
        }
        if (!configuration) {
            throwError("ArgumentNullException", "Configuration cannot be null");
        }

        this._conventions = conventions;
        this._configuration = configuration;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/etl`;

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

