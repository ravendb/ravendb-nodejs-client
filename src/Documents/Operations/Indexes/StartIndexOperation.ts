import {IMaintenanceOperation, OperationResultType} from "../OperationAbstractions";
import {throwError} from "../../../Exceptions";
import {RavenCommand} from "../../../Http/RavenCommand";
import {DocumentConventions} from "../../Conventions/DocumentConventions";
import {HttpRequestParameters} from "../../../Primitives/Http";
import {ServerNode} from "../../../Http/ServerNode";

export class StartIndexOperation implements IMaintenanceOperation<void> {

    private readonly _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new StartIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class StartIndexCommand extends RavenCommand<void> {

    private readonly _indexName: string;

    public constructor(indexName: string) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null");
        }

        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/indexes/start?name="
            + encodeURIComponent(this._indexName);
        return {method: "POST", uri};
    }

    public get isReadRequest() {
        return false;
    }
}
