import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { ConnectionString } from "../../../Documents/Operations/Etl/ConnectionString.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";

export interface RemoveServerWideConnectionStringResult {
    raftCommandIndex: number;
}

export class RemoveServerWideConnectionStringOperation<T extends ConnectionString>
    implements IServerOperation<RemoveServerWideConnectionStringResult> {

    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        if (!connectionString) {
            throwError("ArgumentNullException", "Connection string cannot be null");
        }

        if (StringUtil.isNullOrWhitespace(connectionString.name)) {
            throwError("InvalidArgumentException", "Connection string name must not be null or empty.");
        }

        this._connectionString = connectionString;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<RemoveServerWideConnectionStringResult> {
        return new RemoveServerWideConnectionStringCommand(this._connectionString);
    }
}

export class RemoveServerWideConnectionStringCommand<T extends ConnectionString>
    extends RavenCommand<RemoveServerWideConnectionStringResult>
    implements IRaftCommand {

    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        super();
        this._connectionString = connectionString;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/connection-strings?name="
            + encodeURIComponent(this._connectionString.name)
            + "&type=" + this._connectionString.type;

        return {
            method: "DELETE",
            uri
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
