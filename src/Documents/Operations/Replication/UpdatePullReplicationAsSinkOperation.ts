import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { ModifyOngoingTaskResult } from "../../../ServerWide/ModifyOnGoingTaskResult.js";
import { PullReplicationAsSink } from "./PullReplicationAsSink.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../Exceptions/index.js";
import { normalizePaths } from "./PullReplicationPathFilterUtils.js";

export class UpdatePullReplicationAsSinkOperation implements IMaintenanceOperation<ModifyOngoingTaskResult> {
    private readonly _pullReplication: PullReplicationAsSink;
    private readonly _useServerCertificate: boolean;

    public constructor(pullReplication: PullReplicationAsSink, useServerCertificate: boolean = false) {
        if (!pullReplication) {
            throwError("InvalidArgumentException", "PullReplication cannot be null");
        }

        if (pullReplication.certificateWithPrivateKey != null && useServerCertificate) {
            throwError("InvalidArgumentException",
                "When useServerCertificate is set to true, certificateWithPrivateKey should be null to use server certificate.");
        }

        this._pullReplication = pullReplication;
        this._useServerCertificate = useServerCertificate;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ModifyOngoingTaskResult> {
        return new UpdatePullEdgeReplication(this._pullReplication, this._useServerCertificate);
    }
}

class UpdatePullEdgeReplication extends RavenCommand<ModifyOngoingTaskResult> implements IRaftCommand {
    private readonly _pullReplication: PullReplicationAsSink;
    private readonly _useServerCertificate: boolean;

    public constructor(pullReplication: PullReplicationAsSink, useServerCertificate: boolean) {
        super();

        if (!pullReplication) {
            throwError("InvalidArgumentException", "PullReplication cannot be null");
        }

        this._pullReplication = pullReplication;
        this._useServerCertificate = useServerCertificate;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/tasks/sink-pull-replication";

        const replicationData = {
            ...this._pullReplication,
            allowedHubToSinkPaths: normalizePaths(this._pullReplication.allowedHubToSinkPaths),
            allowedSinkToHubPaths: normalizePaths(this._pullReplication.allowedSinkToHubPaths),
        };

        // Aligned with ServerStore.UpdatePullReplicationAsSink to not introduce breaking changes
        // When using server certificate, remove the certificateWithPrivateKey field
        if (this._pullReplication.certificateWithPrivateKey == null && this._useServerCertificate) {
            delete replicationData.certificateWithPrivateKey;
        }

        const body = this._serializer.serialize({
            PullReplicationAsSink: replicationData
        });

        return {
            method: "POST",
            uri,
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
