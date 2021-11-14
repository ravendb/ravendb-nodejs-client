import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { ServerWideExternalReplicationResponse } from "./ServerWideTaskResponse";
import { ServerWideExternalReplication } from "./ServerWideExternalReplication";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class PutServerWideExternalReplicationOperation implements IServerOperation<ServerWideExternalReplicationResponse> {
    private readonly _configuration: ServerWideExternalReplication;

    public constructor(configuration: ServerWideExternalReplication) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ServerWideExternalReplicationResponse> {
        return new PutServerWideExternalReplicationCommand(this._configuration, conventions);
    }
}

class PutServerWideExternalReplicationCommand extends RavenCommand<ServerWideExternalReplicationResponse> implements IRaftCommand {

    private readonly _configuration: object;

    public constructor(configuration: ServerWideExternalReplication, conventions: DocumentConventions) {
        super();

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = conventions.objectMapper.toObjectLiteral(configuration)
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/external-replication";

        const body = this._serializer.serialize(this._configuration);

        return {
            uri,
            method: "PUT",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}