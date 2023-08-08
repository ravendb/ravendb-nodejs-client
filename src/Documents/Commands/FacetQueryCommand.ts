import { QueryResult } from "../Queries/QueryResult";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import * as stream from "readable-stream";
import { QueryCommand } from "./QueryCommand";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";
import { ServerCasing, ServerResponse } from "../../Types";
import { ObjectUtil } from "../../Utility/ObjectUtil";

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

        const rawResult = await RavenCommandResponsePipeline.create<ServerCasing<ServerResponse<QueryResult>>>()
            .collectBody(bodyCallback)
            .parseJsonSync()
            .process(bodyStream);

        const queryResult = FacetQueryCommand.mapToLocalObject(rawResult, conventions);

        if (fromCache) {
            queryResult.durationInMs = -1;
        }

        return queryResult;
    }

    public static mapToLocalObject(json: ServerCasing<ServerResponse<QueryResult>>, conventions: DocumentConventions): QueryResult {
        const { Results, Includes, IndexTimestamp, LastQueryTime, ...rest } = json;

        const restMapped = ObjectUtil.transformObjectKeys(rest, {
            defaultTransform: "camel"
        }) as any;

        const mappedIncludes: Record<string, any> = {};
        if (json.Includes) {
            for (const [key, value] of Object.entries(json.Includes)) {
                mappedIncludes[key] = ObjectUtil.transformDocumentKeys(value, conventions);
            }
        }

        return {
            ...restMapped,
            indexTimestamp: conventions.dateUtil.parse(IndexTimestamp),
            lastQueryTime: conventions.dateUtil.parse(LastQueryTime),
            results: Results.map(x => ObjectUtil.transformObjectKeys(x, { defaultTransform: "camel" })),
            includes: mappedIncludes
        };
    }
}
