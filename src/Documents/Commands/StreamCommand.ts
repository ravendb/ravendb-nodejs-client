import * as stream from "readable-stream";
import { RavenCommand, ResponseDisposeHandling } from "../../Http/RavenCommand";
import { StreamResultResponse } from "./StreamResultResponse";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http";
import { HttpCache } from "../../Http/HttpCache";

export class StreamCommand extends RavenCommand<StreamResultResponse> {
    private readonly _url: string;

    public constructor(url: string) {
        super();

        if (!url) {
            throwError("InvalidArgumentException", "Url cannot be null.");
        }

        this._url = url;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: `${node.url}/databases/${node.database}/${this._url}`
        };
    }

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: stream.Readable,
        url: string): Promise<ResponseDisposeHandling> {
        this.result = {
            response,
            stream: bodyStream
        };

        return "Manually";
    }

    public get isReadRequest() {
        return true;
    }
}
