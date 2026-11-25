import { QueryResult } from "../Queries/QueryResult.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery.js";
import { throwError } from "../../Exceptions/index.js";
import { Stream } from "node:stream";
import { ServerCasing, ServerResponse } from "../../Types/index.js";
import { QueryTimings } from "../Queries/Timings/QueryTimings.js";
import { QueryInspectionNode } from "../Queries/Timings/QueryInspectionNode.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { readToEnd } from "../../Utility/StreamUtil.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations.js";
import { AbstractQueryCommand } from "./AbstractQueryCommand.js";
import { DateUtil } from "../../Utility/DateUtil.js";

export interface QueryCommandOptions {
    metadataOnly?: boolean;
    indexEntriesOnly?: boolean;
}

export class QueryCommand extends AbstractQueryCommand<QueryResult, { [param: string]: object }> {
    private readonly _conventions: DocumentConventions;
    private readonly _indexQuery: IndexQuery;
    protected readonly _session: InMemoryDocumentSessionOperations;


    public constructor(
        session: InMemoryDocumentSessionOperations, indexQuery: IndexQuery, opts: QueryCommandOptions) {
        super(indexQuery, !indexQuery.disableCaching, opts?.metadataOnly, opts?.indexEntriesOnly, false);

        this._session = session;

        if (!indexQuery) {
            throwError("InvalidArgumentException", "indexQuery cannot be null.");
        }

        this._indexQuery = indexQuery;
        this._conventions = session.conventions;
    }

    protected getQueryHash(): string {
        return this._indexQuery.getQueryHash(this._session.conventions.objectMapper);
    }

    protected _getContent(): string {
        return writeIndexQuery(this._session.conventions, this._indexQuery);
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        this.result = await QueryCommand.parseQueryResultResponseAsync(
            bodyStream, this._session.conventions, fromCache, b => body = b);

        return body;
    }

    public static async parseQueryResultResponseAsync(
        bodyStream: Stream,
        conventions: DocumentConventions,
        fromCache: boolean,
        bodyCallback?: (body: string) => void): Promise<QueryResult> {

        const body = await readToEnd(bodyStream);
        bodyCallback?.(body);

        const parsedJson = JSON.parse(body);

        const queryResult = QueryCommand._mapToLocalObject(parsedJson, conventions);

        if (fromCache) {
            queryResult.durationInMs = -1;

            if (queryResult.timingsInMs) {
                queryResult.timingsInMs.durationInMs = -1;
                queryResult.timingsInMs = null;
            }
        }

        return queryResult;
    }

    private static _mapTimingsToLocalObject(timings: ServerCasing<ServerResponse<QueryTimings>>) {
        if (!timings) {
            return undefined;
        }

        const mapped = new QueryTimings();
        mapped.durationInMs = timings.DurationInMs;
        mapped.queryPlan = QueryCommand._mapQueryPlanToLocalObject(timings.QueryPlan);
        mapped.timings = timings.Timings ? {} : undefined;
        if (timings.Timings) {
            for (const time of Object.keys(timings.Timings)) {
                mapped.timings[StringUtil.uncapitalize(time)] = QueryCommand._mapTimingsToLocalObject(timings.Timings[time]);
            }
        }
        return mapped;
    }

    private static _mapQueryPlanToLocalObject(node: ServerCasing<ServerResponse<QueryInspectionNode>>): QueryInspectionNode {
        if (!node) {
            return undefined;
        }

        return {
            operation: node.Operation,
            parameters: node.Parameters,
            children: node.Children?.map(x => QueryCommand._mapQueryPlanToLocalObject(x))
        };
    }


    private static _mapToLocalObject(json: any, conventions: DocumentConventions): QueryResult {
        const props: Omit<QueryResult, "scoreExplanations" | "cappedMaxResults" | "createSnapshot" | "resultSize"> = {
            results: json.Results.map(x => ObjectUtil.transformDocumentKeys(x, conventions)),
            includes: ObjectUtil.mapIncludesToLocalObject(json.Includes, conventions),
            indexName: json.IndexName,
            indexTimestamp: DateUtil.utc.parse(json.IndexTimestamp),
            includedPaths: json.IncludedPaths,
            isStale: json.IsStale,
            skippedResults: json.SkippedResults,
            totalResults: json.TotalResults,
            highlightings: json.Highlightings,
            explanations: json.Explanations,
            timingsInMs: json.TimingsInMs,
            lastQueryTime: DateUtil.utc.parse(json.LastQueryTime),
            durationInMs: json.DurationInMs,
            resultEtag: json.ResultEtag,
            nodeTag: json.NodeTag,
            scannedResults: json.ScannedResults,
            counterIncludes: ObjectUtil.mapCounterIncludesToLocalObject(json.CounterIncludes),
            includedCounterNames: json.IncludedCounterNames,
            timeSeriesIncludes: ObjectUtil.mapTimeSeriesIncludesToLocalObject(json.TimeSeriesIncludes),
            compareExchangeValueIncludes: ObjectUtil.mapCompareExchangeToLocalObject(json.CompareExchangeValueIncludes),
            revisionIncludes: json.RevisionIncludes,
            timeSeriesFields: json.TimeSeriesFields,
            timings: QueryCommand._mapTimingsToLocalObject(json.Timings)
        }

        return Object.assign(new QueryResult(), props);
    }
}
