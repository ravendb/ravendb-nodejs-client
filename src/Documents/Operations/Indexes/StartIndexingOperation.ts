import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { RavenCommand, DocumentConventions, ServerNode } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";

export class StartIndexingOperation implements IMaintenanceOperation<void> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new StartIndexingCommand();
    }

}

export class StartIndexingCommand extends RavenCommand<void> {
    public get isReadRequest() {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/admin/indexes/start";

        return {
            method: "POST",
            uri
        };
    }
}
