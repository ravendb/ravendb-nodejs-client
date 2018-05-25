import { HttpRequestBase } from "../../../Primitives/Http";
import { ConnectionString } from "../../../ServerWide/ConnectionString";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export interface PutConnectionStringResult {
    eTag: number;
}

export class PutConnectionStringOperation<T extends ConnectionString>
    implements IMaintenanceOperation<PutConnectionStringResult> {

    private _connectionString: T;

    public constructor(connectionString: T) {
        this._connectionString = connectionString;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<PutConnectionStringResult> {
        return new PutConnectionStringCommand(this._connectionString);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}

export class PutConnectionStringCommand<T extends ConnectionString> extends RavenCommand<PutConnectionStringResult> {

    private _connectionString: T;

    public constructor(connectionString: T) {
        super();
        this._connectionString = connectionString;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/admin/connection-strings";

        const headers = this._getHeaders()
            .withContentTypeJson()
            .build();
        const body = this._serializer.serialize(this._connectionString);
        return {
            method: "PUT",
            uri,
            headers,
            body
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        this.result = this._serializer.deserialize(response);
    }
    }