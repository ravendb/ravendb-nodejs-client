import {DocumentConventions} from "../../Conventions/DocumentConventions";
import {IMaintenanceOperation, OperationResultType} from "../OperationAbstractions";
import {IndexStats, CollectionStats} from "../../Indexes/IndexStats";
import {HttpRequestParameters} from "../../../Primitives/Http";
import {ServerNode} from "../../../Http/ServerNode";
import {RavenCommand} from "../../../Http/RavenCommand";
import * as stream from "readable-stream";

export class GetIndexesStatisticsOperation implements IMaintenanceOperation<IndexStats[]> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexStats[]> {
        return new GetIndexesStatisticsCommand();
    }

}

export class GetIndexesStatisticsCommand extends RavenCommand<IndexStats[]> {
    public constructor() {
        super();
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/indexes/stats";
        return {uri};
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                const obj = this._reviveResultTypes(results, {
                    nestedTypes: {
                        "results[].collections": "Map",
                        "results[].collections$MAP": "CollectionStats"
                    }
                }, new Map([[CollectionStats.name, CollectionStats]]));

                this.result = obj["results"];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
