import { RavenCommand } from "../../Http/RavenCommand.js";
import { IndexQuery } from "../Queries/IndexQuery.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { StringBuilder } from "../../Utility/StringBuilder.js";


export abstract class AbstractQueryCommand<TResult, TParameters> extends RavenCommand<TResult>{
    private readonly _metadataOnly: boolean;
    private readonly _indexEntriesOnly: boolean;
    private readonly _ignoreLimit: boolean;
    private readonly _tag: string | undefined;

    protected constructor(indexQuery: IndexQuery, canCache: boolean, metadataOnly: boolean, indexEntriesOnly: boolean, ignoreLimit: boolean) {
        super();

        this._metadataOnly = metadataOnly;
        this._indexEntriesOnly = indexEntriesOnly;
        this._ignoreLimit = ignoreLimit;
        this._tag = indexQuery.tag;

        this._canCache = canCache;

        // we won't allow aggressive caching of queries with WaitForNonStaleResults
        this._canCacheAggressively = canCache && !indexQuery.waitForNonStaleResults;

    }

    public get isReadRequest(): boolean {
        return true;
    }

    protected abstract getQueryHash(): string;

    public createRequest(node: ServerNode): HttpRequestParameters {
        const path = new StringBuilder(node.url)
            .append("/databases/")
            .append(node.database)
            .append("/queries?queryHash=")
            // we need to add a query hash because we are using POST queries
            // so we need to unique parameter per query so the query cache will
            // work properly
            .append(this.getQueryHash());

        if (this._metadataOnly) {
            path.append("&metadataOnly=true");
        }

        if (this._indexEntriesOnly) {
            path.append("&debug=entries");
        }

        if (this._ignoreLimit) {
            path.append("&ignoreLimit=true");
        }

        if (this._tag) {
            path.append("&tag=").append(encodeURIComponent(this._tag));
        }

        path.append("&addTimeSeriesNames=true");

        const uri = path.toString();
        const body = this._getContent();
        const headers = this._headers().typeAppJson().build();
        return {
            method: "POST",
            uri,
            headers,
            body
        };
    }

    protected abstract _getContent(): string;
}
