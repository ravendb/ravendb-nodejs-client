import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";
import { HeadersBuilder } from "../../Utility/HttpUtil";

export interface PutResult {
    id: string;
    changeVector: string;
}

export class PutDocumentCommand extends RavenCommand<PutResult> {

    private _id: string;
    private _changeVector: string;
    private _document: object;

    public constructor(id: string, changeVector: string, document: object) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null or undefined.");
        }

        if (!document) {
            throwError("InvalidArgumentException", "Document cannot be null or undefined.");
        }

        this._id = id;
        this._changeVector = changeVector;
        this._document = document;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = `${node.url}/databases/${node.database}/docs?id=${encodeURIComponent(this._id)}`;
        const body = this._jsonSerializer.serialize(this._document);
        const req = {
            uri,
            method: "PUT",
            body,
            headers: HeadersBuilder.create()
                .withContentTypeJson()
                .build()
        };

        this._addChangeVectorIfNotNull(this._changeVector, req);

        return req;
    }

    public setResponse(response: string, fromCache: boolean): void {
        this.result = this._jsonSerializer.deserialize(response);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
