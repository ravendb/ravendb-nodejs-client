import { CertificateDefinition } from "./CertificateDefinition";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { ServerNode } from "../../../Http/ServerNode";

export class GetCertificatesOperation implements IServerOperation<CertificateDefinition[]> {

    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(start: number, pageSize: number) {
        this._start = start;
        this._pageSize = pageSize;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<CertificateDefinition[]> {
        return new GetCertificatesCommand(this._start, this._pageSize, conventions);
    }

}

class GetCertificatesCommand extends RavenCommand<CertificateDefinition[]> {
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _conventions: DocumentConventions;

    public constructor(start: number, pageSize: number, conventions: DocumentConventions) {
        super();
        this._start = start;
        this._pageSize = pageSize;
        this._conventions = conventions;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/certificates?start=" + this._start + "&pageSize=" + this._pageSize;

        return {
            uri,
            method: "GET"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return null;
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                this.result = this._conventions.objectMapper.fromObjectLiteral<{ results: CertificateDefinition[] }>(results, {
                    nestedTypes: {
                        "results[].notAfter": "date"
                    }
                }).results;
            });

        return body;
    }
}
