import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import * as stream from "readable-stream";
import { streamValues } from "stream-json/streamers/StreamValues";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamObject } from "stream-json/streamers/StreamObject";
import { pick } from "stream-json/filters/Pick";
import { ignore } from "stream-json/filters/Ignore";
import { parseRestOfOutput, parseDocumentIncludes } from "../../Mapping/Json/Streams/Pipelines";
import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";
import { QueryCommand } from "./QueryCommand";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";

export class FacetQueryCommand extends QueryCommand {

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body;
        this.result = await FacetQueryCommand.parseQueryResultResponseAsync(
            bodyStream, this._conventions, fromCache, this._typedObjectMapper, b => body = b);

        return body;
    }

    public static async parseQueryResultResponseAsync(
        bodyStream: stream.Stream,
        conventions: DocumentConventions,
        fromCache: boolean,
        mapper: TypesAwareObjectMapper,
        bodyCallback?: (body: string) => void): Promise<QueryResult> {

        const resultsPromise = RavenCommandResponsePipeline.create<object[]>()
            .collectBody(bodyCallback)
            .parseJsonAsync([
                pick({ filter: "Results" }),
                streamArray()
            ])
            .streamKeyCaseTransform("camel", "DOCUMENT_LOAD") // we don't care about the case in facets
            .collectResult((result, next) => [...result, next["value"]], [])
            .process(bodyStream);

        const includesPromise = parseDocumentIncludes(bodyStream, conventions);
        const restPromise = parseRestOfOutput(bodyStream, /^Results|Includes$/);

        const [results, includes, rest] = await Promise.all([resultsPromise, includesPromise, restPromise]);
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
