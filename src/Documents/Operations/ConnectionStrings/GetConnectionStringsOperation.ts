import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import {
    ConnectionStringType,
    SqlConnectionString,
    RavenConnectionString,
    OlapConnectionString, ElasticSearchConnectionString, QueueConnectionString, SnowflakeConnectionString
} from "../Etl/ConnectionString.js";
import { AiConnectionString } from "../AI/ConnectionStrings/AiConnectionString.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { OperationResultType, IMaintenanceOperation } from "../OperationAbstractions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";

export interface GetConnectionStringsResult {
    ravenConnectionStrings: Record<string, RavenConnectionString>;
    sqlConnectionStrings: Record<string, SqlConnectionString>;
    olapConnectionStrings: Record<string, OlapConnectionString>;
    elasticSearchConnectionStrings: Record<string, ElasticSearchConnectionString>;
    queueConnectionStrings: Record<string, QueueConnectionString>;
    snowflakeConnectionStrings: Record<string, SnowflakeConnectionString>;
    aiConnectionStrings: Record<string, AiConnectionString>;
}

export class GetConnectionStringsOperation implements IMaintenanceOperation<GetConnectionStringsResult> {
    private readonly _connectionStringName: string;
    private readonly _type: ConnectionStringType;

    public constructor()
    public constructor(connectionStringName: string, type: ConnectionStringType)
    public constructor(connectionStringName?: string, type?: ConnectionStringType) {
        this._connectionStringName = connectionStringName;
        this._type = type;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<GetConnectionStringsResult> {
        return new GetConnectionStringCommand(this._connectionStringName, this._type);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class GetConnectionStringCommand extends RavenCommand<GetConnectionStringsResult> {
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
        let uri = node.url + "/databases/" + node.database + "/admin/connection-strings";

        if (this._connectionStringName) {
            uri += "?connectionStringName=" + encodeURIComponent(this._connectionStringName) + "&type=" + this._type;
        }

        return {
            method: "GET",
            uri
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body = "";
        // Connection string names are dictionary keys and must keep their original casing
        // (e.g. server-wide strings propagate as "Server Wide Connection String, <name>").
        // Names may contain dots, so no path regex can tell the name level apart from the field
        // level; the whole *ConnectionStrings subtree is excluded here and the fields of each
        // entry are camel-cased individually below.
        this.result = await this._defaultPipeline(_ => body += _)
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [
                    /^\w+ConnectionStrings\./i
                ]
            })
            .process(bodyStream);

        this.result.ravenConnectionStrings = toTypedConnectionStrings(this.result.ravenConnectionStrings, RavenConnectionString);
        this.result.sqlConnectionStrings = toTypedConnectionStrings(this.result.sqlConnectionStrings, SqlConnectionString);
        this.result.elasticSearchConnectionStrings = toTypedConnectionStrings(this.result.elasticSearchConnectionStrings, ElasticSearchConnectionString);
        this.result.queueConnectionStrings = toTypedConnectionStrings(this.result.queueConnectionStrings, QueueConnectionString);
        this.result.olapConnectionStrings = toTypedConnectionStrings(this.result.olapConnectionStrings, OlapConnectionString);
        this.result.snowflakeConnectionStrings = toTypedConnectionStrings(this.result.snowflakeConnectionStrings, SnowflakeConnectionString);
        this.result.aiConnectionStrings = toTypedConnectionStrings(this.result.aiConnectionStrings, AiConnectionString);

        return body;
    }
}

function toTypedConnectionStrings<T extends object>(
    dict: Record<string, object>,
    ctor: new () => T
): Record<string, T> {
    if (!dict) {
        return dict as Record<string, T>;
    }

    const result: Record<string, T> = {};
    for (const [name, fields] of Object.entries(dict)) {
        // The entry fields kept their server-side (PascalCase) casing - see ignorePaths above.
        result[name] = Object.assign(
            new ctor(),
            fields ? ObjectUtil.transformObjectKeys(fields, { defaultTransform: ObjectUtil.camel }) : fields) as T;
    }
    return result;
}
