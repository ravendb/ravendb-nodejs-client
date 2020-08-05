import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ModifyOngoingTaskResult } from "../../../ServerWide/ModifyOnGoingTaskResult";
import { PullReplicationAsSink } from "./PullReplicationAsSink";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class UpdatePullReplicationAsSinkOperation implements IMaintenanceOperation<ModifyOngoingTaskResult> {
    private readonly _pullReplication: PullReplicationAsSink;

    public constructor(pullReplication: PullReplicationAsSink) {
        this._pullReplication = pullReplication;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ModifyOngoingTaskResult> {
        return new UpdatePullEdgeReplication(this._pullReplication);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class UpdatePullEdgeReplication extends RavenCommand<ModifyOngoingTaskResult> implements IRaftCommand {
    private readonly _pullReplication: PullReplicationAsSink;

    public constructor(pullReplication: PullReplicationAsSink) {
        super();

        this._pullReplication = pullReplication; //TODO: typo in prop name in java?
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/tasks/sink-pull-replication";

        const body = this._serializer.serialize({
            PullReplicationAsSink: this._pullReplication
        }); //TODO: test me!

        return {
            method: "POST",
            uri,
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
