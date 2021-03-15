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
import { ServerResponse } from "../../Types";
import { QueryTimings } from "../Queries/Timings/QueryTimings";
import { StringUtil } from "../../Utility/StringUtil";

export interface QueryCommandOptions {
    metadataOnly?: boolean;
    indexEntriesOnly?: boolean;
}

export class QueryCommand extends RavenCommand<QueryResult> {

    protected _conventions: DocumentConventions;
    private readonly _indexQuery: IndexQuery;
    private readonly _metadataOnly: boolean;
    private readonly _indexEntriesOnly: boolean;

    public constructor(
        conventions: DocumentConventions, indexQuery: IndexQuery, opts: QueryCommandOptions) {
        super();

        this._conventions = conventions;

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
            .append(this._indexQuery.getQueryHash());

        if (this._metadataOnly) {
            path.append("&metadataOnly=true");
        }

        if (this._indexEntriesOnly) {
            path.append("&debug=entries");
        }

        path.append("&addTimeSeriesNames=true");

        const uri = path.toString();
        const body = writeIndexQuery(this._conventions, this._indexQuery);
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
            bodyStream, this._conventions, fromCache, b => body = b);

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

        const rawResult = await RavenCommandResponsePipeline.create<ServerResponse<QueryResult>>()
            .collectBody(bodyCallback)
            .parseJsonAsync()
            .jsonKeysTransform("DocumentQuery", conventions)
            .process(bodyStream);

        const queryResult = QueryCommand._mapToLocalObject(rawResult, conventions);

        if (fromCache) {
            queryResult.durationInMs = -1;

            if (queryResult.timingsInMs) {
                queryResult.timingsInMs.durationInMs = -1;
                queryResult.timingsInMs = null;
            }
        }

        return queryResult;
    }

    private static _mapToLocalObject(json: ServerResponse<QueryResult>, conventions: DocumentConventions): QueryResult {
        const { indexTimestamp, lastQueryTime, timings, ...otherProps } = json;

        const overrides: Partial<QueryResult> = {
            indexTimestamp: conventions.dateUtil.parse(indexTimestamp),
            lastQueryTime: conventions.dateUtil.parse(lastQueryTime),
            timings: QueryCommand._mapTimingsToLocalObject(timings)
        };

        return Object.assign(new QueryResult(), otherProps, overrides);
    }

    private static _mapTimingsToLocalObject(timings: ServerResponse<QueryTimings>) {
        if (!timings) {
            return undefined;
        }

        const mapped = new QueryTimings();
        mapped.durationInMs = timings.durationInMs;
        mapped.timings = timings.timings ? {} : undefined;
        if (timings.timings) {
            Object.keys(timings.timings).forEach(time => {
                mapped.timings[StringUtil.uncapitalize(time)] = QueryCommand._mapTimingsToLocalObject(timings.timings[time]);
            });
        }
        return mapped;
    }
}
