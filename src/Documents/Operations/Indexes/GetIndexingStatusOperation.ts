import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { IndexingStatus } from "../../Indexes/IndexingStatus";
import * as stream from "readable-stream";

export class GetIndexingStatusOperation implements IMaintenanceOperation<IndexingStatus> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexingStatus> {
        return new GetIndexingStatusCommand();
    }

}

export class GetIndexingStatusCommand extends RavenCommand<IndexingStatus> {

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/indexes/status";
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
