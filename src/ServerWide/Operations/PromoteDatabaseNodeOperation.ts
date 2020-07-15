import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabasePutResult } from "./index";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class PromoteDatabaseNodeOperation implements IServerOperation<DatabasePutResult> {
    private readonly _databaseName: string;
    private readonly _node: string;

    public constructor(databaseName: string, node: string) {
        this._databaseName = databaseName;
        this._node = node;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DatabasePutResult> {
        return new PromoteDatabaseNodeCommand(this._databaseName, this._node);
    }
}

class PromoteDatabaseNodeCommand extends RavenCommand<DatabasePutResult> implements IRaftCommand {
    private readonly _databaseName: string;
    private readonly _node: string;

    public constructor(databaseName: string, node: string) {
        super();

        if (!databaseName) {
            throwError("InvalidArgumentException", "DatabaseName cannot be null");
        }

        if (!node) {
            throwError("InvalidArgumentException", "Node cannot be null");
        }

        this._databaseName = databaseName;
        this._node = node;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/databases/promote?name=" + this._databaseName + "&node=" + this._node;

        return {
            uri,
            method: "POST"
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
