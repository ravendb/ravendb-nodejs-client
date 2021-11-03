import { RavenCommand, ResponseDisposeHandling } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters, HttpResponse } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { HttpCache } from "../../Http/HttpCache";
import { StatusCodes } from "../../Http/StatusCode";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { readToEnd, stringToReadable } from "../../Utility/StreamUtil";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";
import { ObjectUtil } from "../../Utility/ObjectUtil";

export class ConditionalGetDocumentsCommand extends RavenCommand<ConditionalGetResult> {

    private readonly _changeVector: string;
    private readonly _id: string;
    private readonly _conventions: DocumentConventions;


    constructor(id: string, changeVector: string, conventions: DocumentConventions) {
        super();

        this._changeVector = changeVector;
        this._id = id;
        this._conventions = conventions;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/docs?id=" + this._urlEncode(this._id);
        
        return {
            uri,
            method: "GET",
            headers: {
                "If-None-Match": `"${this._changeVector}"`
            }
        }
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return;
        }

        let body: string = null;
        this.result =
            await ConditionalGetDocumentsCommand.parseDocumentsResultResponseAsync(
                bodyStream, this._conventions, b => body = b);

        return body as string;
    }

    public static async parseDocumentsResultResponseAsync(
        bodyStream: stream.Stream,
        conventions: DocumentConventions,
        bodyCallback?: (body: string) => void): Promise<ConditionalGetResult> {

        const body = await readToEnd(bodyStream);
        bodyCallback?.(body);

        let parsedJson: any;
        if (body.length > conventions.syncJsonParseLimit) {
            const bodyStreamCopy = stringToReadable(body);
            // response is quite big - fallback to async (slower) parsing to avoid blocking event loop
            parsedJson = await RavenCommandResponsePipeline.create<any>()
                .parseJsonAsync()
                .process(bodyStreamCopy);
        } else {
            parsedJson = JSON.parse(body);
        }

        return ConditionalGetDocumentsCommand._mapToLocalObject(parsedJson, conventions);
    }

    private static _mapToLocalObject(json: any, conventions: DocumentConventions): ConditionalGetResult {
        return {
            results: json.Results.map(x => ObjectUtil.transformDocumentKeys(x, conventions)),
            changeVector: json.ChangeVector
        };
    }

    public async processResponse(cache: HttpCache, response: HttpResponse, bodyStream: stream.Readable, url: string): Promise<ResponseDisposeHandling> {
        if (response.status === StatusCodes.NotModified) {
            return "Automatic";
        }

        const result = await super.processResponse(cache, response, bodyStream, url);
        this.result.changeVector = response.headers.get("ETag");
        return result;
    }

    /**
     * Here we explicitly do _NOT_ want to have caching
     * by the Request Executor, we want to manage it ourselves
     */
    get isReadRequest(): boolean {
        return false;
    }
}

export interface ConditionalGetResult {
    results: any[];
    changeVector: string;
}