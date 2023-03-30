import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabaseRecordWithEtag, IndexHistoryEntry } from "..";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { TimeSeriesConfiguration } from "../../Documents/Operations/TimeSeries/TimeSeriesConfiguration";
import { ServerResponse } from "../../Types";
import { RollingIndexDeployment } from "../../Documents/Indexes/RollingIndexDeployment";
import { DateUtil } from "../../Utility/DateUtil";

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

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return null;
        }

        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .collectBody()
            .objectKeysTransform({
                defaultTransform: "camel",
                ignorePaths: [
                    /^(indexes|sorters|autoIndexes|settings|indexesHistory|ravenConnectionStrings|sqlConnectionStrings|rollingIndexes)\.[^.]+$/i,
                    /^rollingIndexes\.[^.]+\.activeDeployments\.[^.]+$/i,
                    /^indexesHistory\.[^.]+\.[^.]+\.rollingDeployment\.[^.]+$/i,
                    /^timeSeries\./i
                ]
            })
            .process(bodyStream);

        const dateUtil = this._conventions.dateUtil;

        if (this.result.rollingIndexes) {
            Object.values(this.result.rollingIndexes).forEach(index => {
                if (index.activeDeployments) {
                    index.activeDeployments = GetDatabaseRecordCommand.mapRollingDeployment(dateUtil, index.activeDeployments as any);
                }
            });
        }

        const history = this.result.indexesHistory;
        if (history) {

            for (const indexName of Object.keys(history)) {
                const indexHistory = history[indexName];

                history[indexName] = indexHistory.map(item => {
                    const { createdAt, rollingDeployment, ...otherHistoryProps } = item as unknown as ServerResponse<IndexHistoryEntry>;

                    return {
                        ...otherHistoryProps,
                        createdAt: dateUtil.parse(createdAt),
                        rollingDeployment: GetDatabaseRecordCommand.mapRollingDeployment(dateUtil, rollingDeployment)
                    } as IndexHistoryEntry;
                });
            }
        }

        if (this.result.timeSeries) {
            this.result.timeSeries = TimeSeriesConfiguration.parse(this.result.timeSeries as any);
        }

        return body;
    }

    static mapRollingDeployment(dateUtil: DateUtil, input: ServerResponse<Record<string, RollingIndexDeployment>>): Record<string, RollingIndexDeployment> {
        if (!input) {
            return null;
        }

        const result: Record<string, RollingIndexDeployment> = {};
        for (const tag of Object.keys(input)) {
            const deployment = input[tag];
            result[tag] = {
                state: deployment.state,
                createdAt: dateUtil.parse(deployment.createdAt),
                startedAt: dateUtil.parse(deployment.startedAt),
                finishedAt: dateUtil.parse(deployment.finishedAt),
            }
        }

        return result;
    }
}
