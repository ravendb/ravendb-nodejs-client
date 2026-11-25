import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";

export class PutSecretKeyCommand extends RavenCommand<void> {
    private readonly _name: string;
    private readonly _base64Key: string;
    private readonly _overwrite: boolean;

    public constructor(name: string, base64Key: string, overwrite = false) {
        super();

        this._name = name;
        this._base64Key = base64Key;
        this._overwrite = overwrite;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/secrets?name=" + this._urlEncode(this._name);

        if (this._overwrite) {
            uri += "&overwrite=true";
        }

        return {
            uri,
            method: "POST",
            body: this._base64Key
        };
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
