import { HttpRequestParameters } from "../../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class DisableIndexOperation implements IMaintenanceOperation<void> {

    private readonly _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions) {
        return new DisableIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class DisableIndexCommand extends RavenCommand<void> {

    public get isReadRequest() {
        return false;
    }

    private readonly _indexName: string;

    public constructor(indexName: string) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        this._responseType = "Empty";
        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/"
            + node.database + "/admin/indexes/disable?name=" + encodeURIComponent(this._indexName);

        return { method: "POST", uri };
    }
}
