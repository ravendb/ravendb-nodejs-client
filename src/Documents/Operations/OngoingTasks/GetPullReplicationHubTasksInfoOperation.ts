import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { PullReplicationDefinitionAndCurrentConnections } from "../Replication/PullReplicationDefinitionAndCurrentConnections";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";

export class GetPullReplicationHubTasksInfoOperation implements IMaintenanceOperation<PullReplicationDefinitionAndCurrentConnections> {
    private readonly _taskId: number;

    public constructor(taskId: number) {
        this._taskId = taskId;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<PullReplicationDefinitionAndCurrentConnections> {
        return new GetPullReplicationTasksInfoCommand(this._taskId);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

class GetPullReplicationTasksInfoCommand extends RavenCommand<PullReplicationDefinitionAndCurrentConnections> {
    private readonly _taskId: number;

    public constructor(taskId: number) {
        super();
        this._taskId = taskId;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/tasks/pull-replication/hub?key=" + this._taskId;

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream); //TODO: check bindings!
    }

    get isReadRequest(): boolean {
        return false;
    }
}