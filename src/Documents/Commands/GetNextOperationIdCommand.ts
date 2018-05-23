import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";

export class GetNextOperationIdCommand extends RavenCommand<number> {

    public get isReadRequest(): boolean {
        return false; // disable caching
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = `${node.url}/databases/${node.database}/operations/next-operation-id`;
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        const resObj = this._serializer.deserialize<IRavenResponse>(response);

        if ("id" in resObj) {
            this.result = resObj.id;
        }
    }
}
