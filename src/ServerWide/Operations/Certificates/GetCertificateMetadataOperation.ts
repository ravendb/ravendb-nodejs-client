import {
    CertificateDefinition,
    DocumentConventions,
    IServerOperation,
    OperationResultType,
    RavenCommand,
    ServerNode
} from "../../..";
import { CertificateMetadata } from "./CertificateMetadata";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

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
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {

                const resultsMapped = this._conventions.objectMapper.fromObjectLiteral<{ results: CertificateMetadata[] }>(results, {
                    nestedTypes: {
                        "results[].notAfter": "date"
                    }
                }).results;

                if (resultsMapped.length !== 1) {
                    this._throwInvalidResponse();
                }

                this.result = resultsMapped[0];
            });

        return body;
    }
}
