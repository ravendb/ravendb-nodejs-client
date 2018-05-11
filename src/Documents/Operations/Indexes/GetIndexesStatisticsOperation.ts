import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexStats, CollectionStats } from "../../Indexes/IndexStats";
import { HttpRequestBase } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { RavenCommand } from "../../../Http/RavenCommand";

export class GetIndexesStatisticsOperation implements IMaintenanceOperation<IndexStats[]> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexStats[]> {
        return new GetIndexesStatisticsCommand();
    }

}

export class GetIndexesStatisticsCommand extends RavenCommand<IndexStats[]> {
    public constructor() {
        super();
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/indexes/stats";
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        const responseObj = this._parseResponseDefault(response, {
            nestedTypes: {
                "results[].collections": "Map",
                "results[].collections$MAP": "CollectionStats"
            }
        }, new Map([[CollectionStats.name, CollectionStats]]));
        this.result = responseObj["results"];
    }

    public get isReadRequest(): boolean {
        return true;
    }
}