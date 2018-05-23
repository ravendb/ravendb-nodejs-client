import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { HttpRequestBase } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";

export class SeedIdentityForCommand extends RavenCommand<number> {

    private _id: string;
    private _value: number;

    public constructor(id: string, value: number) {
        super();
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
        this._value = value;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        const uri = node.url + "/databases/" + node.database 
            + "/identity/seed?name=" + encodeURIComponent(this._id) + "&value=" + this._value;

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
        if (!jsonNode["newSeedValue"]) {
            this._throwInvalidResponse();
        }

        this.result = jsonNode["newSeedValue"];
    }

}
