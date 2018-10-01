import {RavenCommand} from "../../Http/RavenCommand";
import {ServerNode} from "../../Http/ServerNode";
import {HttpRequestParameters} from "../../Primitives/Http";
import {throwError} from "../../Exceptions";

export class KillOperationCommand extends RavenCommand<void> {

    private readonly _id: number;

    public constructor(id: number) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null.");
        }
        this._id = id;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/operations/kill?id=${this._id}`;
        return {
            uri,
            method: "POST"
        };
    }
}
