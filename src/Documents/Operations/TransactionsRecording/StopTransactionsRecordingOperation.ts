import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions, RavenCommand, ServerNode } from "../../..";
import { HttpRequestParameters } from "../../../Primitives/Http";

export class StopTransactionsRecordingOperation implements IMaintenanceOperation<void> {
    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new StopTransactionsRecordingCommand();
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class StopTransactionsRecordingCommand extends RavenCommand<void> {
    constructor() {
        super();

        this._responseType = "Empty";
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/transactions/stop-recording";

        return {
            uri,
            method: "POST"
        }
    }

    get isReadRequest(): boolean {
        return false;
    }
}