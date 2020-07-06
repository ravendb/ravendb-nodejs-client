import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import * as stream from "readable-stream";
import { DocumentConventions } from "../Conventions/DocumentConventions";

export class GetOperationStateOperation implements IMaintenanceOperation<IRavenResponse> {

    private readonly _id: number;

    public constructor(id: number) {
        this._id = id;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IRavenResponse> {
        return new GetOperationStateCommand(DocumentConventions.defaultConventions, this._id);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetOperationStateCommand extends RavenCommand<IRavenResponse> {

    public get isReadRequest(): boolean {
        return true;
    }

    private _conventions: DocumentConventions;
    private readonly _id: number;

    public constructor(conventions: DocumentConventions, id: number) {
        super();
        this._conventions = conventions;
        this._id = id;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/operations/state?id=${this._id}`;
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
