import { RavenCommand } from "../../Http/RavenCommand";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class DeleteSubscriptionCommand extends RavenCommand<void> implements IRaftCommand {
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

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
