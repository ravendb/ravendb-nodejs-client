import {HttpRequestBase} from "../../Primitives/Http";
import { IRavenResponse } from "../../Types";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../..";
import { ServerNode } from "../../Http/ServerNode";

export class GetServerWideOperationStateOperation implements IServerOperation<IRavenResponse> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
    private _id: number;

    public constructor(id: number) {
        this._id = id;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IRavenResponse> {
        return new GetServerWideOperationStateCommand(DocumentConventions.defaultConventions, this._id);
    }
}

export class GetServerWideOperationStateCommand extends RavenCommand<IRavenResponse> {
    private _id: number;
    private _conventions: DocumentConventions;

    public constructor(conventions: DocumentConventions, id: number) {
        super();

        this._conventions = conventions;
        this._id = id;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/operations/state?id=" + this._id;

        return {
            uri,
            method: "GET"
        };
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            return;
        }

        this.result = this.mapper.deserialize(response);
    }
}