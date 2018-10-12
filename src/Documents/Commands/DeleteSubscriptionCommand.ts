import { ServerNode } from "../..";
import { RavenCommand } from "../../Http/RavenCommand";
import { HttpRequestParameters } from "../../Primitives/Http";

export class DeleteSubscriptionCommand extends RavenCommand<void> {
    private readonly _name: string;

    public constructor(name: string) {
        super();
        this._name = name;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/subscriptions?taskName=" + this._name;
        return {
            uri,
            method: "DELETE"
        };
    }

    public get isReadRequest() {
        return false;
    }
}
