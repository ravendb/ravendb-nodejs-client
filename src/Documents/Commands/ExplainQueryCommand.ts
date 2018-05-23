import {HttpRequestBase} from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";

export interface ExplainQueryResult {
    index: string;
    reason: string;
}

export class ExplainQueryCommand extends RavenCommand<ExplainQueryResult[]> {

    private _conventions: DocumentConventions;
    private _indexQuery: IndexQuery;

    public constructor(conventions: DocumentConventions, indexQuery: IndexQuery) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!indexQuery) {
            throwError("InvalidArgumentException", "IndexQuery cannot be null");
        }

        this._conventions = conventions;
        this._indexQuery = indexQuery;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/queries?debug=explain";

        const headers = this._getHeaders().withContentTypeJson().build();
        return {
            method: "POST",
            uri,
            body: writeIndexQuery(this._conventions, this._indexQuery),
            headers
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this.result = null;
            return;
        }

        const data = this._serializer.deserialize(response);
        const results = data["results"] as ExplainQueryResult[];
        
        if (!results) {
            this._throwInvalidResponse();
            return;
        }

        this.result = results;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
