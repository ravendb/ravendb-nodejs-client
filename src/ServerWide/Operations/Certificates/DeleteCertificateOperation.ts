import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class DeleteCertificateOperation implements IServerOperation<void> {

    private readonly _thumbprint: string;

    public constructor(thumbprint: string) {
        if (!thumbprint) {
            throwError("InvalidArgumentException", "Thumbprint cannot be null.");
        }

        this._thumbprint = thumbprint;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new DeleteCertificateCommand(this._thumbprint);
    }
}

class DeleteCertificateCommand extends RavenCommand<void> {
    private readonly _thumbprint: string;

    public constructor(thumbprint: string) {
        super();
        if (!thumbprint) {
            throwError("InvalidArgumentException", "Thumbprint cannot be null");
        }

        this._thumbprint = thumbprint;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/certificates?thumbprint=" + encodeURIComponent(this._thumbprint);

        return {
            uri,
            method: "DELETE"
        }
    }
}