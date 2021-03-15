import { CertificateMetadata } from "./CertificateMetadata";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { ServerResponse } from "../../../Types";

export class GetCertificateMetadataOperation implements IServerOperation<CertificateMetadata> {
    private readonly _thumbprint: string;

    public constructor(thumbprint: string) {
        if (!thumbprint) {
            throwError("InvalidArgumentException", "Thumbprint cannot be null");
        }

        this._thumbprint = thumbprint;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<CertificateMetadata> {
        return new GetCertificateMetadataCommand(conventions, this._thumbprint);
    }
}

class GetCertificateMetadataCommand extends RavenCommand<CertificateMetadata> {
    private readonly _conventions: DocumentConventions;
    private readonly _thumbprint: string;

    public constructor(conventions: DocumentConventions, thumbprint: string) {
        super();
        this._conventions = conventions;
        this._thumbprint = thumbprint;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url
            + "/admin/certificates?thumbprint="
            + encodeURIComponent(this._thumbprint)
            + "&metadataOnly=true";

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const response = await this._defaultPipeline<ServerResponse<{ results: CertificateMetadata[] }>>(_ => body = _).process(bodyStream);

        const dateUtil = this._conventions.dateUtil;

        const resultsMapped: CertificateMetadata[] = response.results.map(cert => {
            const { notAfter } = cert;

            return {
                ...cert,
                notAfter: dateUtil.parse(notAfter)
            }
        })

        if (resultsMapped.length !== 1) {
            this._throwInvalidResponse();
        }

        this.result = resultsMapped[0];
        return body;
    }
}
