import { DocumentConventions } from "../..";
import { IRavenResponse } from "../../Types";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";

export class GetOperationStateOperation implements IMaintenanceOperation<IRavenResponse> {

    private _id: number;

    public constructor(id: number) {
        this._id = id;
    }

    public  getCommand(conventions: DocumentConventions): RavenCommand<IRavenResponse> {
        return new GetOperationStateCommand(DocumentConventions.defaultConventions, this._id);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

}

export class GetOperationStateCommand extends RavenCommand<IRavenResponse> {

    public get isReadRequest(): boolean {
        return true;
    }

    private _conventions: DocumentConventions;
    private _id: number;

    public constructor(conventions: DocumentConventions, id: number) {
        super();
        this._conventions = conventions;
        this._id = id;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = `${node.url}/databases/${node.database}/operations/state?id=${this._id}`;
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            return;
        }

        this.result = JSON.parse(response);
    }
}
