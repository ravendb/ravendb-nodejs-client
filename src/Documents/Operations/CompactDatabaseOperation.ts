import { HttpRequestBase } from "../../Primitives/Http";
import { IServerOperation, OperationIdResult, OperationResultType } from "./OperationAbstractions";
import { CompactSettings } from "../../ServerWide/CompactSettings";
import { throwError } from "../../Exceptions";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";

export class CompactDatabaseOperation implements IServerOperation<OperationIdResult> {

    private _compactSettings: CompactSettings;

    public constructor(compactSettings: CompactSettings) {
        if (!compactSettings) {
            throwError("InvalidArgumentException", "CompactSettings cannot be null");
        }

        this._compactSettings = compactSettings;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        return new CompactDatabaseCommand(conventions, this._compactSettings);
    }

    public get resultType(): OperationResultType {
        return "OperationId";
    }

}

export class CompactDatabaseCommand extends RavenCommand<OperationIdResult> {
    private _compactSettings: CompactSettings;

    public constructor(conventions: DocumentConventions, compactSettings: CompactSettings) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!compactSettings) {
            throwError("InvalidArgumentException", "CompactSettings cannot be null");
        }

        this._compactSettings = compactSettings;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/admin/compact";
        const body = this._serializer.serialize(this._compactSettings);

        return {
            method: "POST",
            body,
            uri,
            headers: this._getHeaders().withContentTypeJson().build()
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        this.result = this._serializer.deserialize(response);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
