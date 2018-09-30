import {HttpRequestParameters} from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import * as StringBuilder from "string-builder";
import {JsonSerializer } from "../../Mapping/Json/Serializer";
import * as stream from "readable-stream";
import { streamValues } from "stream-json/streamers/StreamValues";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamObject } from "stream-json/streamers/StreamObject";
import { pick } from "stream-json/filters/Pick";
import { ignore } from "stream-json/filters/Ignore";
import { parseDocumentResults, parseRestOfOutput, parseDocumentIncludes } from "../../Mapping/Json/Streams/Pipelines";
import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";

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
        const serializer = super._serializer;
        return serializer;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body;
        this.result = await QueryCommand.parseQueryResultResponseAsync(
            bodyStream, this._conventions, fromCache, this._typedObjectMapper, b => body = b);

        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public static async parseQueryResultResponseAsync(
        bodyStream: stream.Stream,
        conventions: DocumentConventions,
        fromCache: boolean,
        mapper: TypesAwareObjectMapper,
        bodyCallback?: (body: string) => void): Promise<QueryResult> {

        const resultsPromise = parseDocumentResults(bodyStream, conventions, bodyCallback);
        const includesPromise = parseDocumentIncludes(bodyStream, conventions);
        const restPromise = parseRestOfOutput(bodyStream, /^Results|Includes$/);

        const [ results, includes, rest ] = await Promise.all([resultsPromise, includesPromise, restPromise]);
        const rawResult = Object.assign({} as any, rest, { results, includes }) as QueryResult;
        const queryResult = mapper.fromObjectLiteral<QueryResult>(rawResult, {
            typeName: QueryResult.name,
            nestedTypes: {
                indexTimestamp: "date",
                lastQueryTime: "date"
            }
        }, new Map([[QueryResult.name, QueryResult]]));

        if (fromCache) {
            queryResult.durationInMs = -1;
        }

        return queryResult;
    }
}
