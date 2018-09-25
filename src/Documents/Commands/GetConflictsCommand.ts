import {HttpRequestParameters} from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { GetConflictsResult } from "./GetConflictsResult";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";

export class GetConflictsCommand extends RavenCommand<GetConflictsResult> {

    private _id: string;

    public constructor(id: string) {
        super();
        this._id = id;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database 
            + "/replication/conflicts?docId=" + encodeURIComponent(this._id);
        return {
            method: "GET",
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                this.result = this._typedObjectMapper.fromObjectLiteral(results, {
                    nestedTypes: {
                        "results[].lastModified": "Date"
                    }
                });
            });
        
        return body;
    }

}
