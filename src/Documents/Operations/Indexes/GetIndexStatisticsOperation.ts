import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexStats, CollectionStats } from "../../Indexes/IndexStats";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpRequestBase } from "../../../Primitives/Http";
import { ServerNode } from "../../..";

export class GetIndexStatisticsOperation implements IMaintenanceOperation<IndexStats> {
    private _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexStats> {
        return new GetIndexStatisticsCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetIndexStatisticsCommand extends RavenCommand<IndexStats> {
    private _indexName: string;

    public constructor(indexName: string) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database
            + "/indexes/stats?name=" + encodeURIComponent(this._indexName);
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

        const results = responseObj["results"];
        if (!results.length) {
            this._throwInvalidResponse();
        }

        this.result = results[0];
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
