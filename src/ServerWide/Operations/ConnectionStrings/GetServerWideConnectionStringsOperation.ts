import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import {
    ConnectionString,
    ConnectionStringType,
    ElasticSearchConnectionString,
    OlapConnectionString,
    QueueConnectionString,
    RavenConnectionString,
    SqlConnectionString
} from "../../../Documents/Operations/Etl/ConnectionString.js";
import { AiConnectionString } from "../../../Documents/Operations/AI/ConnectionStrings/AiConnectionString.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";
import { ServerWideConnectionString } from "./ServerWideConnectionString.js";

export interface GetServerWideConnectionStringsResult {
    results: ServerWideConnectionString[];
}

export class GetServerWideConnectionStringsOperation implements IServerOperation<GetServerWideConnectionStringsResult> {
    private readonly _connectionStringName: string;
    private readonly _type: ConnectionStringType;

    public constructor()
    public constructor(connectionStringName: string, type: ConnectionStringType)
    public constructor(connectionStringName?: string, type?: ConnectionStringType) {
        if (type !== undefined && StringUtil.isNullOrWhitespace(connectionStringName)) {
            throwError("InvalidArgumentException", "Connection string name must not be null or empty.");
        }

        this._connectionStringName = connectionStringName;
        this._type = type;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<GetServerWideConnectionStringsResult> {
        return new GetServerWideConnectionStringsCommand(this._connectionStringName, this._type);
    }
}

export class GetServerWideConnectionStringsCommand extends RavenCommand<GetServerWideConnectionStringsResult> {
    private readonly _connectionStringName: string;
    private readonly _type: ConnectionStringType;

    public constructor(connectionStringName: string, type: ConnectionStringType) {
        super();
        this._connectionStringName = connectionStringName;
        this._type = type;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/configuration/server-wide/connection-strings";

        const queryParams: string[] = [];
        if (this._connectionStringName) {
            queryParams.push("name=" + encodeURIComponent(this._connectionStringName));
        }
        if (this._type && this._type !== "None") {
            queryParams.push("type=" + this._type);
        }

        if (queryParams.length > 0) {
            uri += "?" + queryParams.join("&");
        }

        return {
            method: "GET",
            uri
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body = "";
        this.result = await this._defaultPipeline(_ => body += _).process(bodyStream);

        this.result.results = (this.result.results || [])
            .map(entry => reviveServerWideConnectionString(entry));

        return body;
    }
}

function reviveServerWideConnectionString(entry: any): ServerWideConnectionString {
    // an entry whose Type is absent or not a string revives as a null element, not a dropped one
    if (!entry || typeof entry.type !== "string") {
        return null;
    }

    const { usedBy, excludedDatabases, type, ...inner } = entry;
    const result = new ServerWideConnectionString();
    result.connectionString = reviveConnectionString(type, inner);
    result.excludedDatabases = excludedDatabases;
    return result;
}

function reviveConnectionString(type: ConnectionStringType, inner: any): ConnectionString {
    switch (type) {
        case "Raven":
            return Object.assign(new RavenConnectionString(), inner);
        case "Sql":
            return Object.assign(new SqlConnectionString(), inner);
        case "Olap":
            return Object.assign(new OlapConnectionString(), inner);
        case "ElasticSearch":
            return Object.assign(new ElasticSearchConnectionString(), inner);
        case "Queue":
            return Object.assign(new QueueConnectionString(), inner);
        case "Ai":
            return Object.assign(new AiConnectionString(), inner);
        default:
            return throwError("NotSupportedException", "Unknown connection string type: " + type);
    }
}
