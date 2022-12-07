import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabasePutResult } from "./index";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class AddDatabaseNodeOperation implements IServerOperation<DatabasePutResult> {
    private readonly _databaseName: string;
    private readonly _nodeTag: string;

    public constructor(databaseName: string, node?: string) {
        this._databaseName = databaseName;
        this._nodeTag = node;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DatabasePutResult> {
        return new AddDatabaseNodeCommand(this._databaseName, this._nodeTag);
    }
}

class AddDatabaseNodeCommand extends RavenCommand<DatabasePutResult> implements IRaftCommand {
    private readonly _databaseName: string;
    private readonly _nodeTag: string;

    public constructor(databaseName: string, nodeTag: string) {
        super();

        if (!databaseName) {
            throwError("InvalidArgumentException", "DatabaseName cannot be null");
        }

        this._databaseName = databaseName;
        this._nodeTag = nodeTag;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/databases/node?name=" + this._databaseName;

        if (this._nodeTag) {
           uri += "&node=" + this._nodeTag;
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

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
