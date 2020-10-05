import { HttpRequestParameters } from "../../Primitives/Http";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";

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

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
