import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabasePutResult } from "./index";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";

export class AddDatabaseNodeOperation implements IServerOperation<DatabasePutResult> {
    private readonly _databaseName: string;
    private readonly _node: string;

    public constructor(databaseName: string, node?: string) {
        this._databaseName = databaseName;
        this._node = node;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DatabasePutResult> {
        return new AddDatabaseNodeCommand(this._databaseName, this._node);
    }
}

class AddDatabaseNodeCommand extends RavenCommand<DatabasePutResult> {
    private readonly _databaseName: string;
    private readonly _node: string;

    public constructor(databaseName: string, node: string) {
        super();

        if (!databaseName) {
            throwError("InvalidArgumentException", "DatabaseName cannot be null");
        }

        this._databaseName = databaseName;
        this._node = node;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/databases/node?name=" + this._databaseName;

        if (node) {
           uri += "&node=" + this._node;
        }

        return {
            uri,
            method: "PUT"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    get isReadRequest(): boolean {
        return false;
    }
}
