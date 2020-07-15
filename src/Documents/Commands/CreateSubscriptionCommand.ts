import { RavenCommand } from "../../Http/RavenCommand";
import { CreateSubscriptionResult } from "../Subscriptions/CreateSubscriptionResult";
import { SubscriptionCreationOptions } from "../Subscriptions/SubscriptionCreationOptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class CreateSubscriptionCommand extends RavenCommand<CreateSubscriptionResult> implements IRaftCommand {
    private readonly _conventions: DocumentConventions;
    private readonly _options: SubscriptionCreationOptions;
    private readonly _id: string;

    public constructor(conventions: DocumentConventions, options: SubscriptionCreationOptions, id?: string) {
        super();
        this._conventions = conventions;
        this._options = options;
        this._id = id;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/subscriptions";

        if (this._id) {
            uri += "?id=" + this._id;
        }

        const body = this._serializer.serialize(this._options);

        return {
            uri,
            method: "PUT",
            body
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest() {
        return false;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
