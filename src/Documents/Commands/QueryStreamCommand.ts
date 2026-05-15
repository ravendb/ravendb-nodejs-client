import { Readable } from "node:stream";
import { RavenCommand, ResponseDisposeHandling } from "../../Http/RavenCommand.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery.js";
import { StreamResultResponse } from "./StreamResultResponse.js";
import { throwError } from "../../Exceptions/index.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http.js";
import { HttpCache } from "../../Http/HttpCache.js";

export class QueryStreamCommand extends RavenCommand<StreamResultResponse> {

    private readonly _conventions: DocumentConventions;
    private readonly _indexQuery: IndexQuery;

    public constructor(conventions: DocumentConventions, query: IndexQuery) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null.");
        }

        if (!query) {
            throwError("InvalidArgumentException", "Query cannot be null.");
        }

        this._conventions = conventions;
        this._indexQuery = query;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/databases/${node.database}/streams/queries?format=jsonl`;

        if (this._indexQuery.tag) {
            uri += `&tag=${encodeURIComponent(this._indexQuery.tag)}`;
        }

        return {
            method: "POST",
            uri,
            body: writeIndexQuery(this._conventions, this._indexQuery),
            headers: this._headers().typeAppJson().build()
        };
    }

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: Readable,
        url: string): Promise<ResponseDisposeHandling> {
        this.result = {
            response,
            stream: bodyStream
        };

        return "Manually";
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
