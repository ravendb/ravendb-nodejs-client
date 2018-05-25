import {HttpRequestBase} from '../../Primitives/Http';
import { RavenCommand } from "../../Http/RavenCommand";
import { GetConflictsResult } from "./GetConflictsResult";
import { ServerNode } from '../../Http/ServerNode';

export class GetConflictsCommand extends RavenCommand<GetConflictsResult> {

    private _id: string;

    public constructor(id: string) {
        super();
        this._id = id;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database 
            + "/replication/conflicts?docId=" + encodeURIComponent(this._id);
        return {
            method: "GET",
            uri
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        const rawResult = this._serializer.deserialize(response);
        this.result = this._typedObjectMapper.fromObjectLiteral(rawResult, {
            nestedTypes: {
                "results[].lastModified": "Date"
            }
        });
    }

}