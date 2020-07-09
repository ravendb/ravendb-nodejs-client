import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class ReplaceClusterCertificateOperation implements IServerOperation<void> {
    private readonly _certBytes: Buffer;
    private readonly _replaceImmediately: boolean;

    public constructor(certBytes: Buffer, replaceImmediately: boolean) {
        if (!certBytes) {
            throwError("InvalidArgumentException", "CertBytes cannot be null");
        }

        this._certBytes = certBytes;
        this._replaceImmediately = replaceImmediately;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new ReplaceClusterCertificateCommand(this._certBytes, this._replaceImmediately);
    }
}

class ReplaceClusterCertificateCommand extends RavenCommand<void> {
    private readonly _certBytes: Buffer;
    private readonly _replaceImmediately: boolean;

    public constructor(certBytes: Buffer, replaceImmediately: boolean) {
        super();
        if (!certBytes) {
            throwError("InvalidArgumentException", "CertBytes cannot be null");
        }

        this._certBytes = certBytes;
        this._replaceImmediately = replaceImmediately;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/certificates/replace-cluster-cert?replaceImmediately=" + (this._replaceImmediately ? "true" : "false");

        const body = this._serializer.serialize({
            Certificate: this._certBytes.toString("base64")
        });

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }
}
