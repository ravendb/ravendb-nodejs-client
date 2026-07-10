import { CertificateMetadata } from "./CertificateMetadata.js";
import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { ServerResponse } from "../../../Types/index.js";
import { DateUtil } from "../../../Utility/DateUtil.js";
import { CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM } from "./CertificateResponseKeyCaseTransform.js";

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

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const response = await this._defaultPipeline<ServerResponse<{ results: CertificateMetadata[] }>>(_ => body = _)
            .objectKeysTransform(CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM)
            .process(bodyStream);

        const resultsMapped: CertificateMetadata[] = response.results.map(cert => {
            const { notAfter, notBefore } = cert;

            return {
                ...cert,
                notAfter: DateUtil.utc.parse(notAfter),
                notBefore: DateUtil.utc.parse(notBefore)
            }
        })

        if (resultsMapped.length !== 1) {
            this._throwInvalidResponse();
        }

        this.result = resultsMapped[0];
        return body;
    }
}
