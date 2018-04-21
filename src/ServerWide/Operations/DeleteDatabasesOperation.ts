import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { throwError } from "../../Exceptions";
import { DocumentConventions } from "../..";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";

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
        return "COMMAND_RESULT";
    }

    private _parameters: DeleteDatabasesParameters;

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
    private _parameters: string;

    public constructor(conventions: DocumentConventions, parameters: DeleteDatabasesParameters) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null.");
        }

        this._parameters = this._commandPayloadSerializer.serialize(parameters);
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/admin/databases";
        return {
            uri,
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: this._parameters,
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        this.result = this._commandPayloadSerializer.deserialize(response);
    }

    public get isReadRequest() {
        return false;
    }
}
