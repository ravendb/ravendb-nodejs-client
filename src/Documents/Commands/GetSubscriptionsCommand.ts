import { RavenCommand } from "../../Http/RavenCommand";
import { SubscriptionState } from "../Subscriptions/SubscriptionState";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { ServerNode } from "../../Http/ServerNode";

export class GetSubscriptionsCommand extends RavenCommand<SubscriptionState[]> {

    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(start: number, pageSize: number) {
        super();

        this._start = start;
        this._pageSize = pageSize;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/subscriptions?start=" + this._start + "&pageSize=" + this._pageSize;

        return {
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        const data = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);
        const results = data["results"] as SubscriptionState[];
        if (!results) {
            this._throwInvalidResponse();
            return;
        }

        this.result = results;
        return body;
    }

    public get isReadRequest() {
        return true;
    }
}
