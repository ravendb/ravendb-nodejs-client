import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";

export class NextIdentityForCommand extends RavenCommand<number> {

    private _id: string;

    public constructor(id: string) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        const uri = node.url + "/databases/" + node.database + "/identity/next?name=" + encodeURIComponent(this._id);
        return {
            method: "POST",
            uri
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        const jsonNode = this._serializer.deserialize(response);
        if (!jsonNode["newIdentityValue"]) {
            this._throwInvalidResponse();
        }

        this.result = jsonNode["newIdentityValue"];
    }
}
