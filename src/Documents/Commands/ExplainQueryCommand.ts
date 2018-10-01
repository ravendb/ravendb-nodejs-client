import {HttpRequestParameters} from "../../Primitives/Http";
import {RavenCommand} from "../../Http/RavenCommand";
import {DocumentConventions} from "../Conventions/DocumentConventions";
import {IndexQuery, writeIndexQuery} from "../Queries/IndexQuery";
import {throwError} from "../../Exceptions";
import {ServerNode} from "../../Http/ServerNode";
import * as stream from "readable-stream";

export interface ExplainQueryResult {
    index: string;
    reason: string;
}

export class ExplainQueryCommand extends RavenCommand<ExplainQueryResult[]> {

    private readonly _conventions: DocumentConventions;
    private readonly _indexQuery: IndexQuery;

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

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/queries?debug=explain";

        const headers = this._headers().typeAppJson().build();
        return {
            method: "POST",
            uri,
            body: writeIndexQuery(this._conventions, this._indexQuery),
            headers
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _)
            .process(bodyStream)
            .then(data => {
                const explainResults = data["results"] as ExplainQueryResult[];
                if (!explainResults) {
                    this._throwInvalidResponse();
                    return;
                }

                this.result = explainResults;
            });

        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
