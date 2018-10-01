import { StatusCodes } from "../../Http/StatusCode";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http";
import { ResponseDisposeHandling, RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { HttpCache } from "../../Http/HttpCache";
import { getRequiredEtagHeader } from "../../Utility/HttpUtil";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";

export class HeadDocumentCommand extends RavenCommand<string> {

    private readonly _id: string;
    private readonly _changeVector: string;

    public constructor(id: string, changeVector: string) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null.");
        }

        this._id = id;
        this._changeVector = changeVector;
        this._responseType = "Empty";
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/docs?id=" + encodeURIComponent(this._id);

        const headers = this._headers()
            .typeAppJson();
        if (this._changeVector) {
            headers.with("If-None-Match", this._changeVector);
        }

        return {
            method: "HEAD",
            uri,
            headers: headers.build()
        };
    }

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: stream.Readable,
        url: string): Promise<ResponseDisposeHandling> {
        if (response.statusCode === StatusCodes.NotModified) {
            this.result = this._changeVector;
            return "Automatic";
        }

        if (response.statusCode === StatusCodes.NotFound) {
            this.result = null;
            return "Automatic";
        }

        this.result = getRequiredEtagHeader(response);
        return "Automatic";
    }
}
