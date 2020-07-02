import {
    ConnectionString,
    DocumentConventions,
    IMaintenanceOperation,
    OperationResultType,
    RavenCommand,
    ServerNode
} from "../../..";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";

export class RemoveConnectionStringOperation<T extends ConnectionString>
    implements IMaintenanceOperation<RemoveConnectionStringResult> {
    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        this._connectionString = connectionString;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<RemoveConnectionStringResult> {
        return new RemoveConnectionStringCommand(this._connectionString);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class RemoveConnectionStringCommand<T extends ConnectionString>
    extends RavenCommand<RemoveConnectionStringResult> {
    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        super();

        this._connectionString = connectionString;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/connection-strings?connectionString="
            + encodeURIComponent(this._connectionString.name) + "&type=" + this._connectionString.type;

        return {
            method: "DELETE",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}

export interface RemoveConnectionStringResult {
    eTag: number;
}
