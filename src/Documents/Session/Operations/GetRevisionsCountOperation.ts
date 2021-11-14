import { RavenCommand } from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";


export class GetRevisionsCountOperation {
    private readonly _docId: string;

    constructor(docId: string) {
        this._docId = docId;
    }

    public createRequest(): RavenCommand<number> {
        return new GetRevisionsCountCommand(this._docId);
    }
}

class GetRevisionsCountCommand extends RavenCommand<number> {
    private readonly _id: string;

    public constructor(id: string) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/revisions/count?&id=" + this._urlEncode(this._id);
        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        const result = await this._defaultPipeline<{ revisionsCount: number }>(_ => body = _).process(bodyStream);

        this.result = result.revisionsCount;
        return body;
    }

    get isReadRequest(): boolean {
        return true;
    }
}
