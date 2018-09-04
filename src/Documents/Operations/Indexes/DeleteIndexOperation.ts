import { HttpRequestParameters } from "../../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class DeleteIndexOperation implements IMaintenanceOperation<void> {
    private _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new DeleteIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class DeleteIndexCommand extends RavenCommand<void> {
    private _indexName: string;

    public constructor(indexName: string) {
        super();

        this._responseType = "Empty";
        
        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null.");
        }

        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/indexes?name=" + encodeURIComponent(this._indexName);
        return { method: "DELETE", uri };
    }

    public get isReadRequest() {
        return false;
    }
}