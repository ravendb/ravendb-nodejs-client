import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";
import { throwError } from "../../Exceptions";
import * as stream from "readable-stream";

export class GetNextOperationIdCommand extends RavenCommand<number> {

    public get isReadRequest(): boolean {
        return false; // disable caching
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/operations/next-operation-id`;
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._getDefaultResponsePipeline() 
            .process(bodyStream)
            .then(results => {
                const id = results.result["id"];
                if (typeof id !== "undefined") {
                    this.result = id;
                }

                return results.body;
            });
    }
}
