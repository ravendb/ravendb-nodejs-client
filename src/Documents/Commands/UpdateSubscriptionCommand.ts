import { IRaftCommand, RavenCommand, ServerNode } from "../..";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { UpdateSubscriptionResult } from "../Subscriptions/UpdateSubscriptionResult";
import { SubscriptionUpdateOptions } from "../Subscriptions/SubscriptionUpdateOptions";

export class UpdateSubscriptionCommand extends RavenCommand<UpdateSubscriptionResult> implements IRaftCommand {
    private readonly _options: SubscriptionUpdateOptions;

    public constructor(options: SubscriptionUpdateOptions) {
        super();

        this._options = options;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/subscriptions/update";

        const body = this._serializer.serialize(this._options);

        return {
            uri,
            body,
            headers: this._headers().typeAppJson().build(),
            method: "POST"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (fromCache) {
            this.result = {
                name: this._options.name
            }

            return;
        }

        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
