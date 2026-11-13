import { IMaintenanceOperation, OperationIdResult, OperationResultType } from "../OperationAbstractions.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { throwError } from "../../../Exceptions/index.js";
import { StringUtil } from "../../../Utility/StringUtil.js";

export interface StartSchemaValidationParameters {
    schemaDefinition: string;
    collection: string;
    /** Server default: 1024. */
    maxErrorMessages?: number;
    /** Server default: unlimited. */
    maxDocumentsToValidate?: number;
    /** Server default: the first document of the collection. */
    startEtag?: number;
}

export class StartSchemaValidationOperation implements IMaintenanceOperation<OperationIdResult> {
    private readonly _parameters: StartSchemaValidationParameters;

    public constructor(parameters: StartSchemaValidationParameters) {
        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        if (StringUtil.isNullOrWhitespace(parameters.schemaDefinition)) {
            throwError("InvalidArgumentException", "Schema must be provided.");
        }

        if (StringUtil.isNullOrWhitespace(parameters.collection)) {
            throwError("InvalidArgumentException", "Collection must be provided.");
        }

        if (parameters.maxErrorMessages != null && parameters.maxErrorMessages < 0) {
            throwError("ArgumentOutOfRangeException", "Property maxErrorMessages must be >= 0.");
        }

        if (parameters.maxDocumentsToValidate != null && parameters.maxDocumentsToValidate <= 0) {
            throwError("ArgumentOutOfRangeException", "Property maxDocumentsToValidate must be > 0.");
        }

        this._parameters = parameters;
    }

    public get resultType(): OperationResultType {
        return "OperationId";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        return new StartSchemaValidationCommand(this._parameters);
    }
}

class StartSchemaValidationCommand extends RavenCommand<OperationIdResult> {
    private readonly _parameters: StartSchemaValidationParameters;

    public constructor(parameters: StartSchemaValidationParameters) {
        super();

        this._parameters = parameters;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/schema-validation/validate";

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._parameters)
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
