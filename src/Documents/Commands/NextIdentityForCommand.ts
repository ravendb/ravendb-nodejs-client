import {RavenCommand} from "../../Http/RavenCommand";
import {throwError} from "../../Exceptions";
import {ServerNode} from "../../Http/ServerNode";
import {HttpRequestParameters} from "../../Primitives/Http";
import * as stream from "readable-stream";

export class NextIdentityForCommand extends RavenCommand<number> {

    private readonly _id: string;

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

        let body: string = null;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                if (!results["newIdentityValue"]) {
                    this._throwInvalidResponse();
                }

                this.result = results["newIdentityValue"];
            });

        return body;
    }
}
