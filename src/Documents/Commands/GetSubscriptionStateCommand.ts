import { ServerNode } from "../..";
import { RavenCommand } from "../../Http/RavenCommand";
import { SubscriptionState } from "../Subscriptions/SubscriptionState";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";

export class GetSubscriptionStateCommand extends RavenCommand<SubscriptionState> {

    private readonly _subscriptionName: string;

    public constructor(subscriptionName: string) {
        super();
        this._subscriptionName = subscriptionName;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/subscriptions/state?name=" + this._subscriptionName;

        return {
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest() {
        return true;
    }
}
