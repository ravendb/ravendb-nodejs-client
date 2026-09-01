import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../Exceptions/index.js";
import { ServerWideConnectionString } from "./ServerWideConnectionString.js";

export interface PutServerWideConnectionStringResult {
    raftCommandIndex: number;
}

export class PutServerWideConnectionStringOperation implements IServerOperation<PutServerWideConnectionStringResult> {
    private readonly _connectionString: ServerWideConnectionString;

    public constructor(connectionString: ServerWideConnectionString) {
        if (!connectionString) {
            throwError("ArgumentNullException", "Connection string cannot be null");
        }

        if (!connectionString.connectionString) {
            throwError("ArgumentNullException", "ServerWideConnectionString.ConnectionString must not be null.");
        }

        this._connectionString = connectionString;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<PutServerWideConnectionStringResult> {
        return new PutServerWideConnectionStringCommand(this._connectionString);
    }
}

export class PutServerWideConnectionStringCommand
    extends RavenCommand<PutServerWideConnectionStringResult>
    implements IRaftCommand {

    private readonly _connectionString: ServerWideConnectionString;

    public constructor(connectionString: ServerWideConnectionString) {
        super();
        this._connectionString = connectionString;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/connection-strings";

        const headers = this._headers()
            .typeAppJson()
            .build();

        // flattened payload: the inner connection string's fields + Type; ExcludedDatabases is dropped when unset
        const body = this._serializer.serialize({
            ...this._connectionString.connectionString,
            type: this._connectionString.type,
            excludedDatabases: this._connectionString.excludedDatabases
        });

        return {
            method: "PUT",
            uri,
            headers,
            body
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
