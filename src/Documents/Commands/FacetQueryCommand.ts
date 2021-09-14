import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import * as stream from "readable-stream";
import { QueryCommand } from "./QueryCommand";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";
import { ServerResponse } from "../../Types";

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

        const rawResult = await RavenCommandResponsePipeline.create<ServerResponse<QueryResult>>()
            .collectBody(bodyCallback)
            .parseJsonAsync()
            .jsonKeysTransform("FacetQuery")
            .process(bodyStream);

        const overrides: Partial<QueryResult> = {
            indexTimestamp: conventions.dateUtil.parse(rawResult.indexTimestamp),
            lastQueryTime: conventions.dateUtil.parse(rawResult.lastQueryTime)
        };

        const queryResult = Object.assign(new QueryResult(), rawResult, overrides) as QueryResult;

        if (fromCache) {
            queryResult.durationInMs = -1;
        }

        return queryResult;
    }
}
