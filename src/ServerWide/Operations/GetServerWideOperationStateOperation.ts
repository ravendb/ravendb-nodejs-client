import { HttpRequestParameters } from "../../Primitives/Http.js";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions.js";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";

export class GetServerWideOperationStateOperation implements IServerOperation<IRavenResponse> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _id: number;

    public constructor(id: number) {
        this._id = id;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IRavenResponse> {
        return new GetServerWideOperationStateCommand(this._id);
    }
}

export class GetServerWideOperationStateCommand extends RavenCommand<IRavenResponse> {
    private readonly _id: number;

    public constructor(id: number)
    public constructor(id: number, nodeTag: string)
    public constructor(id: number, nodeTag?: string) {
        super();

        this._id = id;
        this._selectedNodeTag = nodeTag;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/operations/state?id=" + this._id;

        return {
            uri,
            method: "GET"
        };
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .collectBody()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [/^(result|progress)\.indexesResults\.[^.]+$/i]
            })
            .process(bodyStream);
        return body;
    }
}
