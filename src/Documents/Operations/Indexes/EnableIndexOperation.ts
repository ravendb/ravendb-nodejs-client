import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand, ServerNode } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";

export class EnableIndexOperation implements IMaintenanceOperation<void> {

    private _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions) {
        return new EnableIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}

export class EnableIndexCommand extends RavenCommand<void> {
    private _indexName: string;

    public constructor(indexName: string) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database
            + "/admin/indexes/enable?name=" + encodeURIComponent(this._indexName);
        return {
            method: "POST",
            uri
        };
    }

    public get isReadRequest() {
        return false;
    }
}
