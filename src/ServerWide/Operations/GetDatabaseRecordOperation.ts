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
                    // Dictionary keys (names) may contain dots, so whole subtrees keep server casing and each entry is camel-cased below.
                    /^(indexes|sorters|autoIndexes|settings|indexesHistory|rollingIndexes|\w+ConnectionStrings)\./i,
                    /^timeSeries\./i
                ]
            })
            .process(bodyStream);

        const indexDefinitionDictionaries = ["fields", "configuration", "additionalSources", "schemaDefinitions"];
        GetDatabaseRecordCommand._camelCaseEntries(this.result.indexes, indexDefinitionDictionaries);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.autoIndexes, ["mapFields", "groupByFields"]);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.indexesHistory, [
            ...indexDefinitionDictionaries.map(name => "definition." + name),
            "rollingDeployment"
        ]);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.rollingIndexes, ["activeDeployments"]);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.sorters);

        // A newly added *ConnectionStrings field on the database record must be listed here too.
        GetDatabaseRecordCommand._camelCaseEntries(this.result.ravenConnectionStrings);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.sqlConnectionStrings);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.olapConnectionStrings);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.elasticSearchConnectionStrings);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.queueConnectionStrings);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.snowflakeConnectionStrings);
        GetDatabaseRecordCommand._camelCaseEntries(this.result.aiConnectionStrings);

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

    private static _camelCaseEntries(dict: Record<string, unknown>, nestedDictionaries: string[] = []): void {
        if (!dict) {
            return;
        }

        for (const [name, entry] of Object.entries(dict)) {
            dict[name] = GetDatabaseRecordCommand._camelCaseEntry(entry, nestedDictionaries);
        }
    }

    private static _camelCaseEntry(entry: unknown, nestedDictionaries: string[]): unknown {
        if (Array.isArray(entry)) {
            return entry.map(item => GetDatabaseRecordCommand._camelCaseEntry(item, nestedDictionaries));
        }

        if (!entry || typeof entry !== "object") {
            return entry;
        }

        const result = ObjectUtil.transformObjectKeys(entry, {
            defaultTransform: ObjectUtil.camel,
            ignorePaths: nestedDictionaries.map(path => new RegExp("^" + path.replaceAll(".", "\\.") + "\\."))
        });

        for (const path of nestedDictionaries) {
            const nested = path.split(".").reduce((value, key) => value?.[key], result as any);
            GetDatabaseRecordCommand._camelCaseEntries(nested);
        }

        return result;
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
