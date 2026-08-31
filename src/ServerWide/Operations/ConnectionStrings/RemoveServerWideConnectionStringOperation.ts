import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { ConnectionString } from "../../../Documents/Operations/Etl/ConnectionString.js";
import { throwError } from "../../../Exceptions/index.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { StringUtil } from "../../../Utility/StringUtil.js";

/**
 * The result of a RemoveServerWideConnectionStringOperation.
 */
export interface RemoveServerWideConnectionStringResult {
    /**
     * The Raft command index assigned to this operation. Can be used to wait for the operation to be applied across the cluster.
     */
    raftCommandIndex: number;
}

/**
 * Operation to remove a server-wide connection string from the cluster.
 * The connection string will also be removed from all database records that received it.
 * The operation will fail if the connection string is currently in use by any ongoing task.
 */
export class RemoveServerWideConnectionStringOperation<T extends ConnectionString>
    implements IServerOperation<RemoveServerWideConnectionStringResult> {

    private readonly _connectionString: T;

    /**
     * @param connectionString - The connection string to remove. Only the name and type properties are used;
     * type is already set when passing a concrete connection string instance (e.g. RavenConnectionString).
     */
    public constructor(connectionString: T) {
        if (!connectionString) {
            throwError("InvalidArgumentException", "ConnectionString cannot be null");
        }
        if (StringUtil.isNullOrWhitespace(connectionString.name)) {
            throwError("InvalidArgumentException", "Connection string name must not be null or empty.");
        }
        if (!connectionString.type || connectionString.type === "None") {
            throwError("InvalidArgumentException", "Connection string type must be set.");
        }

        this._connectionString = connectionString;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<RemoveServerWideConnectionStringResult> {
        return new RemoveServerWideConnectionStringCommand(this._connectionString);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class RemoveServerWideConnectionStringCommand<T extends ConnectionString>
    extends RavenCommand<RemoveServerWideConnectionStringResult> implements IRaftCommand {

    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        super();
        this._connectionString = connectionString;
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/connection-strings?name="
            + encodeURIComponent(this._connectionString.name) + "&type=" + this._connectionString.type;

        return {
            uri,
            method: "DELETE"
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}
