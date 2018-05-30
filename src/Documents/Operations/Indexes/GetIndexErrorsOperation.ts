import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexErrors } from "../../Indexes/Errors";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestBase } from "../../../Primitives/Http";

export class GetIndexErrorsOperation implements IMaintenanceOperation<IndexErrors[]> {

    private _indexNames: string[];

    public constructor();
    public constructor(indexNames: string[]);
    public constructor(indexNames: string[] = null) {
        this._indexNames = indexNames;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexErrors[]> {
        return new GetIndexErrorsCommand(this._indexNames);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetIndexErrorsCommand extends RavenCommand<IndexErrors[]> {
    private _indexNames: string[];

    public constructor(indexNames: string[]) {
        super();
        this._indexNames = indexNames;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        let uri = node.url + "/databases/" + node.database + "/indexes/errors";

        if (this._indexNames && this._indexNames.length) {
            uri += "?";

            for (const indexName of this._indexNames) {
                uri += "&name=" + indexName;
            }
        }

        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
            return;
        }

        const typeInfo = {
            nestedTypes: {
                "results[].errors[].timestamp": "date"
            }
        };

        this.result = this._parseResponseDefault(response, typeInfo)["results"];
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
