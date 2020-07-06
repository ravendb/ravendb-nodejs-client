import * as stream from "readable-stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { throwError } from "../../Exceptions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { HeadersBuilder } from "../../Utility/HttpUtil";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";

export interface DeleteDatabaseResult {
    raftCommandIndex: number;
    pendingDeletes: string[];
}

export interface DeleteDatabasesParameters {
    databaseNames: string | string[];
    hardDelete: boolean;
    fromNodes?: string | string[];
    timeToWaitForConfirmation?: number;
}

export class DeleteDatabasesOperation implements IServerOperation<DeleteDatabaseResult> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _parameters: DeleteDatabasesParameters;

    public constructor(parameters: DeleteDatabasesParameters) {
        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters must be provided.");
        }

        if (!parameters.databaseNames || !parameters.databaseNames.length) {
            throwError("InvalidArgumentException", "Database names must be provided.");
        }

        this._parameters = parameters;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DeleteDatabaseResult> {
        return new DeleteDatabaseCommand(conventions, this._parameters);
    }
}

export class DeleteDatabaseCommand extends RavenCommand<DeleteDatabaseResult> {
    private readonly _parameters: string;

    public constructor(conventions: DocumentConventions, parameters: DeleteDatabasesParameters) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null.");
        }

        this._parameters = this._serializer.serialize(parameters);
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/databases";
        return {
            uri,
            method: "DELETE",
            headers: HeadersBuilder.create()
                .typeAppJson()
                .build(),
            body: this._parameters,
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._defaultPipeline(x => body = x).process(bodyStream);
        return body;
    }

    public get isReadRequest() {
        return false;
    }
}
