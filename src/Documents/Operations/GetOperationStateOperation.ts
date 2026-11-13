import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand.js";
import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";

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

        this.timeout = 15_000;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/operations/state?id=${this._id}`;
        return { uri };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .collectBody()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [/^result\.errors\.[^.]+$/i]
            })
            .process(bodyStream);
        return body;
    }
}
