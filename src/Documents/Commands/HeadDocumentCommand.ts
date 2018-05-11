import {StatusCodes} from "../../Http/StatusCode";
import {HttpRequestBase, HttpResponse} from "../../Primitives/Http";
import {ResponseDisposeHandling, RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { HttpCache } from "../../Http/HttpCache";
import { getRequiredEtagHeader } from "../../Utility/HttpUtil";
import { ServerNode } from "../../Http/ServerNode";

export class HeadDocumentCommand extends RavenCommand<string> {

    private _id: string;
    private _changeVector: string;

    public constructor(id: string, changeVector: string) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null.");
        }

        this._id = id;
        this._changeVector = changeVector;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/docs?id=" + encodeURIComponent(this._id);

        const headers = this._getHeaders()
            .withContentTypeJson();
        if (this._changeVector) {
            headers.with("If-None-Match", this._changeVector);
        }

        return {
            method: "HEAD",
            uri,
            headers: headers.build()
        };
    }

    public processResponse(cache: HttpCache, response: HttpResponse, url: string): ResponseDisposeHandling  {
        if (StatusCodes.NotModified === response.statusCode) {
            this.result = this._changeVector;
            return "AUTOMATIC";
        }

        if (response.statusCode === StatusCodes.NotFound) {
            this.result = null;
            return "AUTOMATIC";
        }

        this.result = getRequiredEtagHeader(response);
        return "AUTOMATIC";
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (response) {
            this._throwInvalidResponse();
        }

        this.result = null;
    }
}
