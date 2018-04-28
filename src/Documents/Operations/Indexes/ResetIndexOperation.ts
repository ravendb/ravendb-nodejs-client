import { HttpRequestBase } from "../../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class ResetIndexOperation implements IMaintenanceOperation<void> {

    private _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new ResetIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}
export class ResetIndexCommand extends RavenCommand<void> {
    private _indexName: string;

    public constructor(indexName: string) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null.");
        }

        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/indexes?name=" + encodeURIComponent(this._indexName);
        return { method: "RESET", uri };

    }

    public get isReadRequest() {
        return false;
    }
}
