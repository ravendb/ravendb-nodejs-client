import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";

export class ReorderDatabaseMembersOperation implements IServerOperation<void> {
    private readonly _database: string;
    private readonly _parameters: ReorderDatabaseMembersParameters;

    public constructor(database: string, order: string[]) {
        if (!order || order.length === 0) {
            throwError("InvalidArgumentException", "Order list must contain values");
        }

        this._database = database;
        this._parameters = {
            membersOrder: order
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new ReorderDatabaseMembersCommand(this._database, this._parameters);
    }
}

class ReorderDatabaseMembersCommand extends RavenCommand<void> {
    private readonly _databaseName: string;
    private readonly _parameters: ReorderDatabaseMembersParameters;

    public constructor(databaseName: string, parameters: ReorderDatabaseMembersParameters) {
        super();

        if (!databaseName) {
            throwError("InvalidArgumentException", "Database cannot be empty");
        }

        this._databaseName = databaseName;
        this._parameters = parameters;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/databases/reorder?name=" + this._databaseName;

        const body = this._serializer.serialize(this._parameters);

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }
}

export interface ReorderDatabaseMembersParameters {
    membersOrder: string[];
}
