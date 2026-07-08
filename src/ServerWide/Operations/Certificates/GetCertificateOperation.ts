import { CertificateDefinition } from "./CertificateDefinition.js";
import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM } from "./CertificateResponseKeyCaseTransform.js";

export class GetCertificateOperation implements IServerOperation<CertificateDefinition> {
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

    getCommand(conventions: DocumentConventions): RavenCommand<CertificateDefinition> {
        return new GetCertificateCommand(this._thumbprint, conventions);
    }
}

class GetCertificateCommand extends RavenCommand<CertificateDefinition> {
    private readonly _thumbprint: string;
    private readonly _conventions: DocumentConventions;

    public constructor(thumbprint: string, conventions: DocumentConventions) {
        super();

        if (!thumbprint) {
            throwError("InvalidArgumentException", "Thumbprint cannot be null.");
        }

        this._thumbprint = thumbprint;
        this._conventions = conventions;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/certificates?thumbprint=" + encodeURIComponent(this._thumbprint);

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
        const results = await this._defaultPipeline(_ => body = _)
            .objectKeysTransform(CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM)
            .process(bodyStream);
        const mapped = this._conventions.objectMapper.fromObjectLiteral<{ results: CertificateDefinition[] }>(results, {
            nestedTypes: {
                "results[].notAfter": "date",
                "results[].notBefore": "date"
            }
        }).results;

        if (mapped.length !== 1) {
            this._throwInvalidResponse();
        }

        this.result = mapped[0];

        return body;
    }
}
