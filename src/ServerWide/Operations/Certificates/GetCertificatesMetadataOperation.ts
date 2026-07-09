import { CertificateMetadata } from "./CertificateMetadata.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM } from "./CertificateResponseKeyCaseTransform.js";
import { Stream } from "node:stream";

export class GetCertificatesMetadataOperation implements IServerOperation<CertificateMetadata[]> {
    private readonly _name: string;

    public constructor()
    public constructor(name: string)
    public constructor(name?: string) {
        this._name = name;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<CertificateMetadata[]> {
        return new GetCertificatesMetadataCommand(conventions, this._name);
    }
}

class GetCertificatesMetadataCommand extends RavenCommand<CertificateMetadata[]> {
    private readonly _conventions: DocumentConventions;
    private readonly _name: string;

    public constructor(conventions: DocumentConventions, name: string) {
        super();

        this._conventions = conventions;
        this._name = name;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/certificates?metadataOnly=true";

        if (!StringUtil.isNullOrEmpty(this._name)) {
            uri += "&name=" + encodeURIComponent(this._name);
        }

        return {
            uri,
            method: "GET"
        }
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const results = await this._defaultPipeline<{ results: CertificateMetadata[] }>(_ => body = _)
            .objectKeysTransform(CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM)
            .process(bodyStream);
        this.result = this._conventions.objectMapper.fromObjectLiteral<{ results: CertificateMetadata[] }>(results, {
            nestedTypes: {
                "results[].notAfter": "date",
                "results[].notBefore": "date",
            }
        }).results;

        return body;
    }
}
