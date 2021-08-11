import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import * as stream from "readable-stream";
import { QueryCommand } from "./QueryCommand";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";

export class FacetQueryCommand extends QueryCommand {

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        this.result = await FacetQueryCommand.parseQueryResultResponseAsync(
            bodyStream, this._session.conventions, fromCache, b => body = b);

        return body;
    }

    public static async parseQueryResultResponseAsync(
        bodyStream: stream.Stream,
        conventions: DocumentConventions,
        fromCache: boolean,
        bodyCallback?: (body: string) => void): Promise<QueryResult> {

        const rawResult = await RavenCommandResponsePipeline.create<QueryResult>()
            .collectBody(bodyCallback)
            .parseJsonAsync()
            .jsonKeysTransform("FacetQuery")
            .process(bodyStream);
        const queryResult = conventions.objectMapper.fromObjectLiteral<QueryResult>(rawResult, {
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
