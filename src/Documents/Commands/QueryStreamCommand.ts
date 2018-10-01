import * as stream from "readable-stream";
import { RavenCommand, ResponseDisposeHandling } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery";
import { StreamResultResponse } from "./StreamResultResponse";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http";
import { HttpCache } from "../../Http/HttpCache";

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
        return {
            method: "POST",
            uri: `${node.url}/databases/${node.database}/streams/queries`,
            body: writeIndexQuery(this._conventions, this._indexQuery),
            headers: this._headers().typeAppJson().build()
        };
    }

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: stream.Readable,
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
