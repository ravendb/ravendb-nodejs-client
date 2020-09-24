import { HttpRequestParameters } from "../../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ModifyOngoingTaskResult } from "../../../ServerWide/ModifyOnGoingTaskResult";
import { ExternalReplication } from "../../Replication/ExternalReplication";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class UpdateExternalReplicationOperation implements IMaintenanceOperation<ModifyOngoingTaskResult> {

    private readonly _newWatcher: ExternalReplication;

    public constructor(newWatcher: ExternalReplication) {
        this._newWatcher = newWatcher;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ModifyOngoingTaskResult> {
        return new UpdateExternalReplicationCommand(this._newWatcher);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class UpdateExternalReplicationCommand extends RavenCommand<ModifyOngoingTaskResult> implements IRaftCommand {
    private readonly _newWatcher: ExternalReplication;

    public constructor(newWatcher: ExternalReplication) {
        super();
        this._newWatcher = newWatcher;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/tasks/external-replication";

        const headers = this._headers()
            .typeAppJson().build();
        const body = this._serializer.serialize({ watcher: this._newWatcher });
        return {
            method: "POST",
            uri,
            headers,
            body
        };
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
