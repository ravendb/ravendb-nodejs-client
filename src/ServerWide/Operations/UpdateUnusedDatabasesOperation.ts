import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { StringUtil } from "../../Utility/StringUtil";
import { throwError } from "../../Exceptions";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class UpdateUnusedDatabasesOperation implements IServerOperation<void> {
    private readonly _database: string;
    private readonly _parameters: UpdateUnusedDatabasesParameters;

    public constructor(database: string, unusedDatabaseIds: string[], validate: boolean = false) {
        if (StringUtil.isNullOrEmpty(database)) {
            throwError("InvalidArgumentException", "Database cannot be null");
        }

        this._database = database;
        this._parameters = {
            databaseIds: unusedDatabaseIds,
            validate
        };
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new UpdateUnusedDatabasesCommand(this._database, this._parameters);
    }
}

class UpdateUnusedDatabasesCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _database: string;
    private readonly _parameters: UpdateUnusedDatabasesParameters;

    public constructor(database: string, parameters: UpdateUnusedDatabasesParameters) {
        super();

        this._database = database;
        this._parameters = parameters;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/databases/unused-ids?name=" + this._database;

        if (this._parameters.validate) {
            uri += "&validate=true";
        }

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

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

export interface UpdateUnusedDatabasesParameters {
    databaseIds: string[];
    validate: boolean;
}
