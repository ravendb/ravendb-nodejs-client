import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class UnregisterReplicationHubAccessOperation implements IMaintenanceOperation<void> {
    private readonly _hubName: string;
    private readonly _thumbprint: string;

    public constructor(hubName: string, thumbprint: string) {
        if (StringUtil.isNullOrEmpty(hubName)) {
            throwError("InvalidArgumentException", "HubName cannot be null or whitespace");
        }

        if (StringUtil.isNullOrEmpty(thumbprint)) {
            throwError("InvalidArgumentException", "Thumbprint cannot be null or whitespace.");
        }

        this._hubName = hubName;
        this._thumbprint = thumbprint;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new UnregisterReplicationHubAccessCommand(this._hubName, this._thumbprint);
    }
}

class UnregisterReplicationHubAccessCommand extends RavenCommand<void> implements IRaftCommand {

    private readonly _hubName: string;
    private readonly _thumbprint: string;

    public constructor(hubName: string, thumbprint: string) {
        super();

        this._hubName = hubName;
        this._thumbprint = thumbprint;
        this._responseType = "Empty";
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/admin/tasks/pull-replication/hub/access?name=" + this._urlEncode(this._hubName)
            + "&thumbprint=" + this._urlEncode(this._thumbprint);

        return {
            uri,
            method: "DELETE"
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}