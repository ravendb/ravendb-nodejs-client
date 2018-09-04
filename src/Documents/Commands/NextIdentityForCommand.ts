import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";

export class NextIdentityForCommand extends RavenCommand<number> {

    private _id: string;

    public constructor(id: string) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        const uri = node.url + "/databases/" + node.database + "/identity/next?name=" + encodeURIComponent(this._id);
        return {
            method: "POST",
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._getDefaultResponsePipeline()
            .process(bodyStream)
            .then(results => {

                if (!results.result["newIdentityValue"]) {
                    this._throwInvalidResponse();
                }

                this.result = results.result["newIdentityValue"];
                
                return results.body;
            });
    }
}
