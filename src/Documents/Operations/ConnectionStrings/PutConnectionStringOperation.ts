import { HttpRequestParameters } from "../../../Primitives/Http";
import { ConnectionString } from "../../../ServerWide/ConnectionString";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";

export interface PutConnectionStringResult {
    eTag: number;
}

export class PutConnectionStringOperation<T extends ConnectionString>
    implements IMaintenanceOperation<PutConnectionStringResult> {

    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        this._connectionString = connectionString;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<PutConnectionStringResult> {
        return new PutConnectionStringCommand(this._connectionString);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class PutConnectionStringCommand<T extends ConnectionString> extends RavenCommand<PutConnectionStringResult> {

    private readonly _connectionString: T;

    public constructor(connectionString: T) {
        super();
        this._connectionString = connectionString;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/connection-strings";

        const headers = this._headers()
            .typeAppJson()
            .build();
        const body = this._serializer.serialize(this._connectionString);
        return {
            method: "PUT",
            uri,
            headers,
            body
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
