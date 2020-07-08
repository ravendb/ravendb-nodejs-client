import { CertificateDefinition } from "./CertificateDefinition";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { DocumentConventions, IServerOperation, OperationResultType, RavenCommand, ServerNode } from "../../..";

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

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                const mapped = this._conventions.objectMapper.fromObjectLiteral<{ results: CertificateDefinition[] }>(results, {
                    nestedTypes: {
                        "results[].notAfter": "date"
                    }
                }).results;

                if (mapped.length !== 1) {
                    this._throwInvalidResponse();
                }

                this.result = mapped[0];
            });

        return body;
    }
}
