import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import {
    ConnectionString,
    ConnectionStringType,
    ElasticSearchConnectionString,
    OlapConnectionString,
    QueueConnectionString,
    RavenConnectionString,
    SnowflakeConnectionString,
    SqlConnectionString
} from "../../../Documents/Operations/Etl/ConnectionString.js";
import { AiConnectionString } from "../../../Documents/Operations/AI/ConnectionStrings/AiConnectionString.js";
import { ServerWideConnectionString } from "./ServerWideConnectionString.js";
import { throwError } from "../../../Exceptions/index.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { StringUtil } from "../../../Utility/StringUtil.js";

/**
 * The result of a GetServerWideConnectionStringsOperation.
 */
export interface GetServerWideConnectionStringsResult {
    /**
     * The list of server-wide connection strings matching the query criteria.
     */
    results: ServerWideConnectionString[];
}

/**
 * Operation to retrieve server-wide connection strings from the cluster.
 * Can retrieve all server-wide connection strings or filter by name and type.
 */
export class GetServerWideConnectionStringsOperation implements IServerOperation<GetServerWideConnectionStringsResult> {
    private readonly _connectionStringName: string;
    private readonly _type: ConnectionStringType;

    /**
     * Retrieves all server-wide connection strings of all types.
     */
    public constructor();
    /**
     * Retrieves a specific server-wide connection string.
     * @param connectionStringName - The name of a specific connection string to retrieve
     * @param type - The type of connection strings to retrieve
     */
    public constructor(connectionStringName: string, type: ConnectionStringType);
    public constructor(connectionStringName?: string, type?: ConnectionStringType) {
        if (connectionStringName != null || type != null) {
            if (StringUtil.isNullOrWhitespace(connectionStringName)) {
                throwError("InvalidArgumentException", "Connection string name must not be null or empty.");
            }
        }

        this._connectionStringName = connectionStringName;
        this._type = type;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<GetServerWideConnectionStringsResult> {
        return new GetServerWideConnectionStringsCommand(this._connectionStringName, this._type);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class GetServerWideConnectionStringsCommand extends RavenCommand<GetServerWideConnectionStringsResult> {
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
        const uriParams = new URLSearchParams();
        if (this._connectionStringName != null) {
            uriParams.append("name", this._connectionStringName);
        }
        if (this._type != null && this._type !== "None") {
            uriParams.append("type", this._type);
        }

        const uri = node.url + "/admin/configuration/server-wide/connection-strings"
            + (uriParams.size > 0 ? "?" + uriParams : "");

        return {
            method: "GET",
            uri
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        const raw = await this._defaultPipeline<{ results: any[] }>(_ => body = _).process(bodyStream);

        const results: ServerWideConnectionString[] = [];

        for (const item of raw.results ?? []) {
            // Each entry is the underlying connection string's fields flattened to the top level,
            // plus type, excludedDatabases and usedBy (matches the C# ServerWideConnectionString wire format).
            const { excludedDatabases, usedBy, ...connectionStringFields } = item;

            const result = new ServerWideConnectionString();
            result.connectionString = createTypedConnectionString(item.type, connectionStringFields);
            result.excludedDatabases = excludedDatabases ?? null;
            result.usedBy = usedBy ?? [];
            results.push(result);
        }

        this.result = { results };
        return body;
    }
}

function createTypedConnectionString(type: ConnectionStringType, fields: object): ConnectionString {
    switch (type) {
        case "Raven":
            return Object.assign(new RavenConnectionString(), fields);
        case "Sql":
            return Object.assign(new SqlConnectionString(), fields);
        case "Olap":
            return Object.assign(new OlapConnectionString(), fields);
        case "ElasticSearch":
            return Object.assign(new ElasticSearchConnectionString(), fields);
        case "Queue":
            return Object.assign(new QueueConnectionString(), fields);
        case "Snowflake":
            return Object.assign(new SnowflakeConnectionString(), fields);
        case "Ai":
            return Object.assign(new AiConnectionString(), fields);
        default:
            throwError("NotSupportedException", `Unknown connection string type: ${type}`);
    }
}
