import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import * as stream from "readable-stream";
import { DocumentConventions } from "../Conventions/DocumentConventions";

export class GetOperationStateOperation implements IMaintenanceOperation<IRavenResponse> {

    private readonly _id: number;
    private readonly _nodeTag: string;

    public constructor(id: number, nodeTag?: string) {
        this._id = id;
        this._nodeTag = nodeTag;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IRavenResponse> {
        return new GetOperationStateCommand(this._id, this._nodeTag);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetOperationStateCommand extends RavenCommand<IRavenResponse> {

    public get isReadRequest(): boolean {
        return true;
    }

    private readonly _id: number;

    public constructor(id: number, nodeTag?: string) {
        super();
        this._id = id;
        this._selectedNodeTag = nodeTag;
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
