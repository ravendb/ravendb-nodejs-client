import { HttpRequestParameters } from "../../Primitives/Http";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";

export class DeleteDocumentCommand extends RavenCommand<void> {
    private readonly _id: string;
    private readonly _changeVector: string;

    public constructor(id: string);
    public constructor(id: string, changeVector: string);
    public constructor(id: string, changeVector: string = null) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null.");
        }

        this._responseType = "Empty";
        this._id = id;
        this._changeVector = changeVector;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        const uri = node.url + "/databases/" + node.database + "/docs?id=" + encodeURIComponent(this._id);

        const request = {
            method: "DELETE",
            uri,
            headers: this._headers().build()
        };
        this._addChangeVectorIfNotNull(this._changeVector, request);

        return request;
    }

    public get isReadRequest() {
        return false;
    }
}
