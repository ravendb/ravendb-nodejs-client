import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ReplicationHubAccess } from "./ReplicationHubAccess";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand, ResponseDisposeHandling } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters, HttpResponse } from "../../../Primitives/Http";
import { HttpCache } from "../../../Http/HttpCache";
import * as stream from "readable-stream";
import { StatusCodes } from "../../../Http/StatusCode";

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

        const headers = this._headers().typeAppJson().build();
        const body = this._serializer.serialize(this._access);

        return {
            uri,
            method: "PUT",
            headers,
            body
        }
    }

    async processResponse(cache: HttpCache, response: HttpResponse, bodyStream: stream.Readable, url: string): Promise<ResponseDisposeHandling> {
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

