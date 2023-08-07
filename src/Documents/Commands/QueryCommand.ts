import { HttpRequestParameters } from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { JsonSerializer } from "../../Mapping/Json/Serializer";
import * as stream from "readable-stream";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";
import { StringBuilder } from "../../Utility/StringBuilder";
import { ServerCasing, ServerResponse } from "../../Types";
import { QueryTimings } from "../Queries/Timings/QueryTimings";
import { StringUtil } from "../../Utility/StringUtil";
import { readToEnd, stringToReadable } from "../../Utility/StreamUtil";
import { ObjectUtil } from "../../Utility/ObjectUtil";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations";

export interface QueryCommandOptions {
    metadataOnly?: boolean;
    indexEntriesOnly?: boolean;
}

export class QueryCommand extends RavenCommand<QueryResult> {

    protected _session: InMemoryDocumentSessionOperations;
    private readonly _indexQuery: IndexQuery;
    private readonly _metadataOnly: boolean;
    private readonly _indexEntriesOnly: boolean;

    public constructor(
        session: InMemoryDocumentSessionOperations, indexQuery: IndexQuery, opts: QueryCommandOptions) {
        super();

        this._session = session;

        if (!indexQuery) {
            throwError("InvalidArgumentException", "indexQuery cannot be null.");
        }

        this._indexQuery = indexQuery;

        opts = opts || {};
        this._metadataOnly = opts.metadataOnly;
        this._indexEntriesOnly = opts.indexEntriesOnly;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        this._canCache = !this._indexQuery.disableCaching;

        // we won't allow aggressive caching of queries with WaitForNonStaleResults
        this._canCacheAggressively = this._canCache && !this._indexQuery.waitForNonStaleResults;

        const path = new StringBuilder(node.url)
            .append("/databases/")
            .append(node.database)
            .append("/queries?queryHash=")
            // we need to add a query hash because we are using POST queries
            // so we need to unique parameter per query so the query cache will
            // work properly
            .append(this._indexQuery.getQueryHash(this._session.conventions.objectMapper));

        if (this._metadataOnly) {
            path.append("&metadataOnly=true");
        }

        if (this._indexEntriesOnly) {
            path.append("&debug=entries");
        }

        path.append("&addTimeSeriesNames=true");

        const uri = path.toString();
        const body = writeIndexQuery(this._session.conventions, this._indexQuery);
        const headers = this._headers().typeAppJson().build();
        return {
            method: "POST",
            uri,
            headers,
            body
        };
    }

    protected get _serializer(): JsonSerializer {
        return super._serializer;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        this.result = await QueryCommand.parseQueryResultResponseAsync(
            bodyStream, this._session.conventions, fromCache, b => body = b);

        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public static async parseQueryResultResponseAsync(
        bodyStream: stream.Stream,
        conventions: DocumentConventions,
        fromCache: boolean,
        bodyCallback?: (body: string) => void): Promise<QueryResult> {

        const body = await readToEnd(bodyStream);
        bodyCallback?.(body);

        let parsedJson: any;
        if (body.length > conventions.syncJsonParseLimit) {
            const bodyStreamCopy = stringToReadable(body);
            // response is quite big - fallback to async (slower) parsing to avoid blocking event loop
            parsedJson = await RavenCommandResponsePipeline.create<ServerResponse<QueryResult>>()
                .parseJsonAsync()
                .process(bodyStreamCopy);
        } else {
            parsedJson = JSON.parse(body);
        }

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
        mapped.timings = timings.Timings ? {} : undefined;
        if (timings.Timings) {
            Object.keys(timings.Timings).forEach(time => {
                mapped.timings[StringUtil.uncapitalize(time)] = QueryCommand._mapTimingsToLocalObject(timings.Timings[time]);
            });
        }
        return mapped;
    }


    private static _mapToLocalObject(json: any, conventions: DocumentConventions): QueryResult {
        const mappedIncludes: Record<string, any> = {};
        if (json.Includes) {
            for (const [key, value] of Object.entries(json.Includes)) {
                mappedIncludes[key] = ObjectUtil.transformDocumentKeys(value, conventions);
            }
        }

        const props: Omit<QueryResult, "scoreExplanations" | "cappedMaxResults" | "createSnapshot" | "resultSize"> = {
            results: json.Results.map(x => ObjectUtil.transformDocumentKeys(x, conventions)),
            includes: mappedIncludes,
            indexName: json.IndexName,
            indexTimestamp: conventions.dateUtil.parse(json.IndexTimestamp),
            includedPaths: json.IncludedPaths,
            isStale: json.IsStale,
            skippedResults: json.SkippedResults,
            totalResults: json.TotalResults,
            longTotalResults: json.LongTotalResults,
            highlightings: json.Highlightings,
            explanations: json.Explanations,
            timingsInMs: json.TimingsInMs,
            lastQueryTime: conventions.dateUtil.parse(json.LastQueryTime),
            durationInMs: json.DurationInMs,
            resultEtag: json.ResultEtag,
            nodeTag: json.NodeTag,
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
