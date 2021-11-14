import {
    DocumentConventions,
    IMaintenanceOperation,
    IRaftCommand,
    OperationResultType,
    RavenCommand,
    ServerNode
} from "../../src";
import { HttpRequestParameters } from "../../src/Primitives/Http";
import { RaftIdGenerator } from "../../src/Utility/RaftIdGenerator";
import stream from "readable-stream";

export class GenerateCertificateOperation implements IMaintenanceOperation<PullReplicationCertificate> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<PullReplicationCertificate> {
        return new GenerateCertificateCommand();
    }
}

class GenerateCertificateCommand extends RavenCommand<PullReplicationCertificate> implements IRaftCommand {
    get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/pull-replication/generate-certificate";
        return {
            method: "POST",
            uri
        }
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}

export interface PullReplicationCertificate {
    publicKey: string;
    certificate: string;
    thumbprint: string;
}