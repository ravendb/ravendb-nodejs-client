import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { IndexStats, CollectionStats } from "../../Indexes/IndexStats.js";
import { throwError } from "../../../Exceptions/index.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { ServerNode } from "../../../Http/ServerNode.js";

export class GetIndexStatisticsOperation implements IMaintenanceOperation<IndexStats> {
    private readonly _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexStats> {
        return new GetIndexStatisticsCommand(this._indexName, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetIndexStatisticsCommand extends RavenCommand<IndexStats> {
    private readonly _indexName: string;
    private readonly _conventions: DocumentConventions;

    public constructor(indexName: string, conventions: DocumentConventions) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
        this._conventions = conventions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/indexes/stats?name=" + encodeURIComponent(this._indexName);
        return { uri };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _)
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [/^results\.\[\]\.collections\.[^.]+$/]
            })
            .process(bodyStream);
        for (const r of results["results"]) {
            r.collections = Object.keys(r.collections)
                .map(name => [name, r.collections[name]]);
        }
        const responseObj = this._reviveResultTypes(
            results,
            this._conventions,
            {
                nestedTypes: {
                    "results[].collections": "Map",
                    "results[].collections$MAP": "CollectionStats",
                    "results[].lastQueryingTime": "date",
                    "results[].createdTimestamp": "date",
                    "results[].lastIndexingTime": "date"
                }
            }, new Map([[CollectionStats.name, CollectionStats]]));

        const indexStatsResults = responseObj["results"];
        if (!indexStatsResults.length) {
            this._throwInvalidResponse();
        }

        this.result = indexStatsResults[0];
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
