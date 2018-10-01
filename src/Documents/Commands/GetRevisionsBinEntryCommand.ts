import {DocumentConventions, IRavenArrayResult, RavenCommand, ServerNode} from "../..";
import {HttpRequestParameters} from "../../Primitives/Http";
import {TypeUtil} from "../../Utility/TypeUtil";
import * as stream from "readable-stream";
import {GetDocumentsCommand} from "./GetDocumentsCommand";

export class GetRevisionsBinEntryCommand extends RavenCommand<IRavenArrayResult> {
    private readonly _conventions: DocumentConventions;
    private readonly _etag: number;
    private readonly _pageSize: number;

    public constructor(conventions: DocumentConventions, etag: number, pageSize: number) {
        super();

        this._conventions = conventions;
        this._etag = etag;
        this._pageSize = pageSize;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/revisions/bin?etag=" + this._etag;

        if (TypeUtil.isNullOrUndefined(this._pageSize)) {
            uri += "&pageSize=" + this._pageSize;
        }

        return {
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        this.result =
            await GetDocumentsCommand.parseDocumentsResultResponseAsync(
                bodyStream, this._conventions, b => body = b);

        return body as string;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
