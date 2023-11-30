import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { PullReplicationDefinition } from "./PullReplicationDefinition";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { ModifyOngoingTaskResult } from "../../../ServerWide/ModifyOnGoingTaskResult";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class PutPullReplicationAsHubOperation implements IMaintenanceOperation<ModifyOngoingTaskResult> {
    private readonly _pullReplicationDefinition: PullReplicationDefinition;

    public constructor(name: string)
    public constructor(pullReplicationDefinition: PullReplicationDefinition)
    public constructor(nameOrDefinition: string | PullReplicationDefinition) {
        if (TypeUtil.isString(nameOrDefinition)) {
            const name = nameOrDefinition;
            if (StringUtil.isNullOrEmpty(name)) {
                throwError("InvalidArgumentException", "Name cannot be null or empty");
            }

            this._pullReplicationDefinition = {
                name
            }
        } else {
            const pullReplicationDefinition = nameOrDefinition;
            if (StringUtil.isNullOrEmpty(pullReplicationDefinition.name)) {
                throwError("InvalidArgumentException", "Name cannot be null or empty");
            }

            this._pullReplicationDefinition = pullReplicationDefinition;
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ModifyOngoingTaskResult> {
        return new UpdatePullReplicationDefinitionCommand(this._pullReplicationDefinition);
    }
}

class UpdatePullReplicationDefinitionCommand extends RavenCommand<ModifyOngoingTaskResult> implements IRaftCommand {
    private readonly _pullReplicationDefinition: PullReplicationDefinition;

    public constructor(pullReplicationDefinition: PullReplicationDefinition) {
        super();
        this._pullReplicationDefinition = pullReplicationDefinition;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/tasks/pull-replication/hub";

        const body = this._serializer.serialize(this._pullReplicationDefinition);

        return {
            method: "PUT",
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
