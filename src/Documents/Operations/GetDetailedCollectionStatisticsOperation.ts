import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { DetailedCollectionStatistics } from "./DetailedCollectionStatistics";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";

export class GetDetailedCollectionStatisticsOperation implements IMaintenanceOperation<DetailedCollectionStatistics> {
    getCommand(conventions: DocumentConventions): RavenCommand<DetailedCollectionStatistics> {
        return new GetDetailedCollectionStatisticsCommand();
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

class GetDetailedCollectionStatisticsCommand extends RavenCommand<DetailedCollectionStatistics> {
    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/collections/stats/detailed";

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
