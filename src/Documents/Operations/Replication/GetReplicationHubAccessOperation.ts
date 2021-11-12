import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DetailedReplicationHubAccess } from "./DetailedReplicationHubAccess";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class GetReplicationHubAccessOperation implements IMaintenanceOperation<DetailedReplicationHubAccess[]> {
    private readonly _hubName: string;
    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(hubName: string, start: number = 0, pageSize: number = 25) {
        this._hubName = hubName;
        this._start = start;
        this._pageSize = pageSize;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DetailedReplicationHubAccess[]> {
        return new GetReplicationHubAccessCommand(conventions, this._hubName, this._start, this._pageSize);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class GetReplicationHubAccessCommand extends RavenCommand<DetailedReplicationHubAccess[]> {
    private readonly _conventions: DocumentConventions;
    private readonly _hubName: string;
    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(conventions: DocumentConventions, hubName: string, start: number, pageSize: number) {
        super();

        if (StringUtil.isNullOrWhitespace(hubName)) {
            throwError("InvalidArgumentException", "Value cannot be null or whitespace.");
        }

        this._conventions = conventions;
        this._hubName = hubName;
        this._start = start;
        this._pageSize = pageSize;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/admin/tasks/pull-replication/hub/access?name=" + encodeURIComponent(this._hubName)
            + "&start=" + this._start
            + "&pageSize=" + this._pageSize;

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
        const rawResults = await this._defaultPipeline<{ results: DetailedReplicationHubAccess[] }>(_ => body = _).process(bodyStream);

        this.result = this._conventions.objectMapper.fromObjectLiteral<typeof rawResults>(rawResults, {
            nestedTypes: {
                "results[].notAfter": "date",
                "results[].notBefore": "date"
            }
        }).results;

        return body;
    }
}

