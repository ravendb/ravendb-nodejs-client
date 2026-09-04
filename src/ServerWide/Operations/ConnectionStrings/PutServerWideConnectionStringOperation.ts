import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { ServerWideConnectionString } from "./ServerWideConnectionString.js";
import { throwError } from "../../../Exceptions/index.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { Stream } from "node:stream";

/**
 * The result of a PutServerWideConnectionStringOperation.
 */
export interface PutServerWideConnectionStringResult {
    /**
     * The Raft command index assigned to this operation. Can be used to wait for the operation to be applied across the cluster.
     */
    raftCommandIndex: number;
}

/**
 * Operation to create or update a server-wide connection string.
 * The connection string will be automatically propagated to all databases in the cluster
 * (unless explicitly excluded via ServerWideConnectionString.excludedDatabases).
 */
export class PutServerWideConnectionStringOperation implements IServerOperation<PutServerWideConnectionStringResult> {
    private readonly _connectionString: ServerWideConnectionString;

    public constructor(connectionString: ServerWideConnectionString) {
        if (!connectionString) {
            throwError("InvalidArgumentException", "ConnectionString cannot be null");
        }
        if (!connectionString.connectionString) {
            throwError("InvalidArgumentException", "connectionString.connectionString must not be null.");
        }

        this._connectionString = connectionString;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<PutServerWideConnectionStringResult> {
        return new PutServerWideConnectionStringCommand(this._connectionString);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class PutServerWideConnectionStringCommand extends RavenCommand<PutServerWideConnectionStringResult> implements IRaftCommand {
    private readonly _connectionString: ServerWideConnectionString;

    public constructor(connectionString: ServerWideConnectionString) {
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
        const uri = node.url + "/admin/configuration/server-wide/connection-strings";

        // The wire format is the underlying connection string's fields flattened to the top level,
        // plus Type and ExcludedDatabases (matches the C# ServerWideConnectionString.ToJson()).
        const payload = {
            ...this._connectionString.connectionString,
            type: this._connectionString.type,
            excludedDatabases: this._connectionString.excludedDatabases ?? null
        };

        const body = this._serializer.serialize(payload);

        return {
            uri,
            method: "PUT",
            headers: this._headers().typeAppJson().build(),
            body
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}
