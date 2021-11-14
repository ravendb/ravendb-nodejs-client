import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { ServerWideExternalReplication } from "./ServerWideExternalReplication";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { GetServerWideExternalReplicationsResponse } from "../../../Documents/Operations/GetServerWideExternalReplicationsResponse";

export class GetServerWideExternalReplicationOperation implements IServerOperation<ServerWideExternalReplication> {
    private readonly _name: string;

    public constructor(name: string) {
        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ServerWideExternalReplication> {
        return new GetServerWideExternalReplicationCommand(this._name);
    }
}
class GetServerWideExternalReplicationCommand extends RavenCommand<ServerWideExternalReplication> {

    private readonly _name: string;

    public constructor(name: string) {
        super();

        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/tasks?type=" + "Replication" + "&name=" + this._urlEncode(this._name);

        return {
            uri,
            method: "GET"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const results = await this._defaultPipeline<GetServerWideExternalReplicationsResponse>(_ => body = _)
            .process(bodyStream);

        if (results.results.length > 1) {
            this._throwInvalidResponse();
        }

        this.result = results.results[0];

        return body;
    }
}