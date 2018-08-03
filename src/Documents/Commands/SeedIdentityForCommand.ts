import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";

export class SeedIdentityForCommand extends RavenCommand<number> {

    private _id: string;
    private _value: number;

    public constructor(id: string, value: number) {
        super();
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
        this._value = value;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        const uri = node.url + "/databases/" + node.database 
            + "/identity/seed?name=" + encodeURIComponent(this._id) + "&value=" + this._value;

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
            .then(({ result, body }) => {

                const newSeedValue = result["newSeedValue"];
                if (!newSeedValue) {
                    this._throwInvalidResponse();
                }

                this.result = newSeedValue;
                
                return body;
            });
    }

}
