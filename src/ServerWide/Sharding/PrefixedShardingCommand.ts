import { RavenCommand } from "../../Http/RavenCommand.js";
import { IRaftCommand } from "../../Http/IRaftCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator.js";
import { PrefixedShardingSetting } from "./PrefixedShardingSetting.js";

export class PrefixedShardingCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _method: "PUT" | "POST" | "DELETE";
    private readonly _setting: Partial<PrefixedShardingSetting>;

    public constructor(method: "PUT" | "POST" | "DELETE", setting: Partial<PrefixedShardingSetting>) {
        super();
        this._method = method;
        this._setting = setting;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/databases/" + node.database + "/admin/sharding/prefixed",
            method: this._method,
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._setting)
        };
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
