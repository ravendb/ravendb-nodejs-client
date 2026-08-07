import { HttpRequestParameters } from "../../Primitives/Http.js";
import { Stream } from "node:stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions.js";
import { DatabaseRecordWithEtag, IndexHistoryEntry } from "../index.js";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { TimeSeriesConfiguration } from "../../Documents/Operations/TimeSeries/TimeSeriesConfiguration.js";
import { ServerResponse } from "../../Types/index.js";
import { RollingIndexDeployment } from "../../Documents/Indexes/RollingIndexDeployment.js";
import { DateUtil } from "../../Utility/DateUtil.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";

export class GetDatabaseRecordOperation implements IServerOperation<DatabaseRecordWithEtag> {
    private readonly _database: string;

    public constructor(database: string) {
        this._database = database;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DatabaseRecordWithEtag> {
        return new GetDatabaseRecordCommand(conventions, this._database);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class GetDatabaseRecordCommand extends RavenCommand<DatabaseRecordWithEtag> {
    private readonly _conventions: DocumentConventions;
    private readonly _database: string;

    public constructor(conventions: DocumentConventions, database: string) {
        super();

        this._conventions = conventions;
        this._database = database;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/databases?name=" + this._database;
        return {
            method: "GET",
            uri
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return null;
        }

        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .collectBody()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [
                    /^(indexes|sorters|autoIndexes|settings|indexesHistory|rollingIndexes)\.[^.]+$/i,
                    // Connection string names are dictionary keys and must keep their original casing;
                    // matches the name level of any current or future *ConnectionStrings dictionary.
                    /^\w+ConnectionStrings\.[^.]+$/i,
                    /^rollingIndexes\.[^.]+\.activeDeployments\.[^.]+$/i,
                    /^indexesHistory\.[^.]+\.[^.]+\.rollingDeployment\.[^.]+$/i,
                    /^timeSeries\./i
                ]
            })
            .process(bodyStream);

        if (this.result.rollingIndexes) {
            for (const index of Object.values(this.result.rollingIndexes)) {
                if (index.activeDeployments) {
                    index.activeDeployments = GetDatabaseRecordCommand.mapRollingDeployment(index.activeDeployments as any);
                }
            }
        }

        const history = this.result.indexesHistory;
        if (history) {

            for (const indexName of Object.keys(history)) {
                const indexHistory = history[indexName];

                history[indexName] = indexHistory.map(item => {
                    const { createdAt, rollingDeployment, ...otherHistoryProps } = item as unknown as ServerResponse<IndexHistoryEntry>;

                    return {
                        ...otherHistoryProps,
                        createdAt: DateUtil.utc.parse(createdAt),
                        rollingDeployment: GetDatabaseRecordCommand.mapRollingDeployment(rollingDeployment)
                    } as IndexHistoryEntry;
                });
            }
        }

        if (this.result.timeSeries) {
            this.result.timeSeries = TimeSeriesConfiguration.parse(this.result.timeSeries as any);
        }

        return body;
    }

    static mapRollingDeployment(input: ServerResponse<Record<string, RollingIndexDeployment>>): Record<string, RollingIndexDeployment> {
        if (!input) {
            return null;
        }

        const result: Record<string, RollingIndexDeployment> = {};
        for (const tag of Object.keys(input)) {
            const deployment = input[tag];
            result[tag] = {
                state: deployment.state,
                createdAt: DateUtil.utc.parse(deployment.createdAt),
                startedAt: DateUtil.utc.parse(deployment.startedAt),
                finishedAt: DateUtil.utc.parse(deployment.finishedAt),
            }
        }

        return result;
    }
}
