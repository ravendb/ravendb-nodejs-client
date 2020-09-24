import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";
import { TypeUtil } from "../../Utility/TypeUtil";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class SeedIdentityForCommand extends RavenCommand<number> implements IRaftCommand {

    private readonly _id: string;
    private readonly _value: number;
    private readonly _forced: boolean;

    public constructor(id: string, value: number, forced?: boolean) {
        super();
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
        this._value = value;
        this._forced = forced;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        let uri = node.url + "/databases/" + node.database
            + "/identity/seed?name=" + encodeURIComponent(this._id) + "&value=" + this._value;

        if (this._forced) {
            uri += "&force=true";
        }

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
            .then(result => {
                const newSeedValue = result["newSeedValue"];
                if (TypeUtil.isNullOrUndefined(newSeedValue)) {
                    this._throwInvalidResponse();
                }

                this.result = newSeedValue;
            });

        return body;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
