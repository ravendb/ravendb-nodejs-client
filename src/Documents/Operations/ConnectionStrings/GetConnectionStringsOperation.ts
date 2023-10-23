import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import {
    ConnectionStringType,
    SqlConnectionString,
    RavenConnectionString,
    OlapConnectionString, ElasticSearchConnectionString, QueueConnectionString
} from "../Etl/ConnectionString";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { OperationResultType, IMaintenanceOperation } from "../OperationAbstractions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { OlapEtlConfiguration } from "../Etl/Olap/OlapEtlConfiguration";

export interface GetConnectionStringsResult {
    ravenConnectionStrings: Record<string, RavenConnectionString>;
    sqlConnectionStrings: Record<string, SqlConnectionString>;
    olapConnectionStrings: Record<string, OlapConnectionString>;
    elasticSearchConnectionStrings: Record<string, ElasticSearchConnectionString>;
    queueConnectionStrings: Record<string, QueueConnectionString>;
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

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body = "";
        this.result = await this._defaultPipeline(_ => body += _).process(bodyStream);

        if (this.result.ravenConnectionStrings) {
            this.result.ravenConnectionStrings = Object.entries(this.result.ravenConnectionStrings)
                .reduce(((previousValue, currentValue) => {
                    previousValue[currentValue[0]] = Object.assign(new RavenConnectionString(), currentValue[1]);
                    return previousValue;
                }), {} as Record<string, RavenConnectionString>);
        }

        if (this.result.sqlConnectionStrings) {
            this.result.sqlConnectionStrings = Object.entries(this.result.sqlConnectionStrings)
                .reduce(((previousValue, currentValue) => {
                    previousValue[currentValue[0]] = Object.assign(new SqlConnectionString(), currentValue[1]);
                    return previousValue;
                }), {} as Record<string, SqlConnectionString>);
        }

        if (this.result.olapConnectionStrings) {
            this.result.olapConnectionStrings = Object.entries(this.result.olapConnectionStrings)
                .reduce(((previousValue, currentValue) => {
                    previousValue[currentValue[0]] = Object.assign(new OlapConnectionString(), currentValue[1]);
                    return previousValue;
                }), {} as Record<string, OlapConnectionString>);
        }

        return body;
    }
}
