import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { RavenCommand, DocumentConventions, ServerNode } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";

export class StopIndexingOperation implements IMaintenanceOperation<void> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new StopIndexingCommand();
    }

}

export class StopIndexingCommand extends RavenCommand<void> {
    public get isReadRequest() {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/admin/indexes/stop";

        return {
            method: "POST",
            uri
        };
    }
}
