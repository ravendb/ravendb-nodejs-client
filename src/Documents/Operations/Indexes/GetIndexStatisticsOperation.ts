import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexStats, CollectionStats } from "../../Indexes/IndexStats";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../..";
import * as stream from "readable-stream";

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

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _)
            .process(bodyStream)
            .then(results => {
                for (const r of results["results"]) {
                    r.collections = Object.keys(r.collections)
                        .reduce((result, next) => [ ...result, [ next, result[next] ]], []);
                }
                const responseObj = this._reviveResultTypes(
                    results, 
                    this._conventions,
                    {
                        nestedTypes: {
                            "results[].collections": "Map",
                            "results[].collections$MAP": "CollectionStats"
                        }
                    }, new Map([[CollectionStats.name, CollectionStats]]));

                const indexStatsResults = responseObj["results"];
                if (!indexStatsResults.length) {
                    this._throwInvalidResponse();
                }

                this.result = indexStatsResults[0];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
