import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { ReplicationHubAccess } from "./ReplicationHubAccess.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand, ResponseDisposeHandling } from "../../../Http/RavenCommand.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters, HttpResponse } from "../../../Primitives/Http.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { Readable } from "node:stream";
import { StatusCodes } from "../../../Http/StatusCode.js";
import { normalizePaths } from "./PullReplicationPathFilterUtils.js";

export class RegisterReplicationHubAccessOperation implements IMaintenanceOperation<void> {
    private readonly _hubName: string;
    private readonly _access: ReplicationHubAccess;

    public constructor(hubName: string, access: ReplicationHubAccess) {
        if (StringUtil.isNullOrWhitespace(hubName)) {
            throwError("InvalidArgumentException", "HubName cannot be null or whitespace.");
        }

        if (!access) {
            throwError("InvalidArgumentException", "Access cannot be null");
        }

        this._hubName = hubName;
        this._access = access;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }


    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new RegisterReplicationHubAccessCommand(this._hubName, this._access);
    }

}

class RegisterReplicationHubAccessCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _hubName: string;
    private readonly _access: ReplicationHubAccess;

    public constructor(hubName: string, access: ReplicationHubAccess) {
        super();

        if (StringUtil.isNullOrWhitespace(hubName)) {
            throwError("InvalidArgumentException", "HubName cannot be null or whitespace.");
        }

        if (!access) {
            throwError("InvalidArgumentException", "Access cannot be null");
        }

        this._hubName = hubName;
        this._access = access;
        this._responseType = "Empty";
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/tasks/pull-replication/hub/access?name=" + this._urlEncode(this._hubName);

        const access = {
            ...this._access,
            allowedHubToSinkPaths: normalizePaths(this._access.allowedHubToSinkPaths),
            allowedSinkToHubPaths: normalizePaths(this._access.allowedSinkToHubPaths),
        };

        const headers = this._headers().typeAppJson().build();
        const body = this._serializer.serialize(access);

        return {
            uri,
            method: "PUT",
            headers,
            body
        }
    }

    async processResponse(cache: HttpCache, response: HttpResponse, bodyStream: Readable, url: string): Promise<ResponseDisposeHandling> {
        if (response.status === StatusCodes.NotFound) {
            throwError("ReplicationHubNotFoundException",
                "The replication hub " + this._hubName + " was not found on the database. Did you forget to define it first?");
        }
        return "Automatic";
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

