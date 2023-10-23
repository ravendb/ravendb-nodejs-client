import { RavenCommand } from "../../Http/RavenCommand";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import { StringUtil } from "../../Utility/StringUtil";

export class DropSubscriptionConnectionCommand extends RavenCommand<void> {

    private readonly _name: string;
    private readonly _workerId: string;

    public constructor(name: string, workerId?: string) {
        super();
        this._name = name;
        this._workerId = workerId;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/subscriptions/drop";

        if (!StringUtil.isNullOrEmpty(this._name)) {
            uri += "?name=" + encodeURIComponent(this._name);
        }

        if (!StringUtil.isNullOrEmpty(this._workerId)) {
            uri += "&workerId=" + encodeURIComponent(this._workerId);
        }

        return {
            method: "POST",
            uri
        };
    }

    public get isReadRequest() {
        return false;
    }
}
