import {HttpRequestBase} from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexQuery } from "../Queries/IndexQuery";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import * as StringBuilder from "string-builder";
import { JsonSerializer } from "../../Mapping";
import { TypeUtil } from "../../Utility/TypeUtil";
import { ObjectKeysTransform } from "../../Mapping/ObjectMapper";

export class QueryCommand extends RavenCommand<QueryResult> {

    private _conventions: DocumentConventions;
    private _indexQuery: IndexQuery;
    private _metadataOnly: boolean;
    private _indexEntriesOnly: boolean;

    public constructor(
        conventions: DocumentConventions, indexQuery: IndexQuery, metadataOnly: boolean, indexEntriesOnly: boolean) {
        super();

        this._conventions = conventions;

        if (!indexQuery) {
            throwError("InvalidArgumentException", "indexQuery cannot be null.");
        }

        this._indexQuery = indexQuery;
        this._metadataOnly = metadataOnly;
        this._indexEntriesOnly = indexEntriesOnly;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
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
        const headers = this._getHeaders().withContentTypeJson().build();
        return {
            method: "POST",
            uri,
            headers,
            body
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this.result = null;
            return;
        }

        const rawResult = ObjectKeysTransform.camelCase(JsonSerializer.getDefault().deserialize(response), false);
        this.result = this._typedObjectMapper.fromObjectLiteral(rawResult, {
            typeName: QueryResult.name
        }, new Map([[QueryResult.name, QueryResult]]));

        if (fromCache) {
            this.result.durationInMs = -1;
        }
    }

    public get isReadRequest(): boolean {
        return true;
    }
}

export function writeIndexQuery(conventions: DocumentConventions, indexQuery: IndexQuery): string {
    const result = {
        Query: indexQuery.query
    };

    if (indexQuery.pageSizeSet && indexQuery.pageSize >= 0) {
        result["PageSize"] = indexQuery.pageSize;
    }

    if (indexQuery.waitForNonStaleResults) {
        result["WaitForNonStaleResults"] = indexQuery.waitForNonStaleResults;
    }

    if (indexQuery.start > 0) {
        result["Start"] = indexQuery.start;
    }

    if (!TypeUtil.isNullOrUndefined(indexQuery.waitForNonStaleResultsTimeout)) {
        result["WaitForNonStaleResultsTimeout"] = indexQuery.waitForNonStaleResultsTimeout;
    }

    if (indexQuery.disableCaching) {
        result["DisableCaching"] = indexQuery.disableCaching;
    }

    /* TBD
    if (query.isExplainScores()) {
        generator.writeBooleanField("ExplainScores", query.isExplainScores());
    }*/

    /* TBD
    if (query.isShowTimings()) {
        generator.writeBooleanField("ShowTimings", query.isShowTimings());
    }*/

    if (indexQuery.skipDuplicateChecking) {
        result["SkipDuplicateChecking"] = indexQuery.skipDuplicateChecking;
    }

    if (!indexQuery.queryParameters) {
        result["QueryParameters"] = null;
    } else {
        result["QueryParameters"] = indexQuery.queryParameters;
    }

    return JsonSerializer.getDefault().serialize(result);
}