import { HttpRequestParameters } from "../../Primitives/Http";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { no } from "change-case";

export class GetServerWideOperationStateOperation implements IServerOperation<IRavenResponse> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _id: number;

    public constructor(id: number) {
        this._id = id;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IRavenResponse> {
        return new GetServerWideOperationStateCommand(DocumentConventions.defaultConventions, this._id);
    }
}

export class GetServerWideOperationStateCommand extends RavenCommand<IRavenResponse> {
    private readonly _id: number;
    private _conventions: DocumentConventions;

    public constructor(conventions: DocumentConventions, id: number)
    public constructor(conventions: DocumentConventions, id: number, nodeTag: string)
    public constructor(conventions: DocumentConventions, id: number, nodeTag?: string) {
        super();

        this._conventions = conventions;
        this._id = id;
        this.selectedNodeTag = nodeTag;
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
