import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";
import { Mapping, JsonSerializer } from "../../Mapping";
import { HeadersBuilder, getHeaders } from "../../Utility/HttpUtil";
import { IRavenObject } from "../..";
import { ObjectKeysTransform } from "../../Mapping/ObjectMapper";

export interface GetDocumentsByIdCommandOptions {
    id: string;
    includes?: string[];
    metadataOnly?: boolean;
}

export interface GetDocumentsByIdsCommandOptions {
    ids: string[];
    includes?: string[];
    metadataOnly?: boolean;
}

export interface GetDocumentsStartingWithOptions {
    start: number;
    pageSize: number;
    startsWith?: string;
    startsAfter?: string;
    matches?: string;
    exclude?: string;
    metadataOnly?: boolean;
}

export interface GetDocumentsResult {
    includes: IRavenObject;
    results: any[];
    nextPageStart: number;
}

export class GetDocumentsCommand extends RavenCommand<GetDocumentsResult> {

    private _id: string;

    private _ids: string[];
    private _includes: string[];

    private _metadataOnly: boolean;

    private _startsWith: string;
    private _matches: string;
    private _start: number;
    private _pageSize: number;
    private _exclude: string;
    private _startAfter: string;


    public constructor(
        opts: GetDocumentsByIdCommandOptions | GetDocumentsByIdsCommandOptions | GetDocumentsStartingWithOptions) {
        super();
        if (opts.hasOwnProperty("id")) {
            opts = opts as GetDocumentsByIdCommandOptions;
            this._id = opts.id;
            this._includes = opts.includes;
            this._metadataOnly = opts.metadataOnly;
        } else if (opts.hasOwnProperty("ids")) {
            opts = opts as GetDocumentsByIdsCommandOptions;
            this._ids = opts.ids;
            this._includes = opts.includes;
            this._metadataOnly = opts.metadataOnly;
        } else if (opts.hasOwnProperty("start") && opts.hasOwnProperty("pageSize")) {
            opts = opts as GetDocumentsStartingWithOptions;
            this._start = opts.start;
            this._pageSize = opts.pageSize;

            if (opts.hasOwnProperty("startWith")) {
                this._startsWith = opts.startsWith;
                this._startAfter = opts.startsAfter;
                this._matches = opts.matches;
                this._exclude = opts.exclude;
                this._metadataOnly = opts.metadataOnly;
            }
        }
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uriPath = `${node.url}/databases/${node.database}/docs?`;

        let query = "";
        if (this._start) {
            query += `&start=${this._start}`;
        }

        if (this._pageSize) {
            query += `&pageSize=${this._pageSize}`;
        }

        if (this._metadataOnly) {
            query += "&metadataOnly=true";
        }

        if (this._startsWith) {
            query += `&startsWith=${encodeURIComponent(this._startsWith)}`;

            if (this._matches) {
                query += `&matches=${this._matches}`;
            }

            if (this._exclude) {
                query += `&exclude=${this._exclude}`;
            }

            if (this._startAfter) {
                query += `&startAfter=${this._startAfter}`;
            }
        }

        if (this._includes) {
            for (const include of this._includes) {
                query += `&include=${include}`;
            }
        }

        let request: HttpRequestBase = { method: "GET", uri: uriPath + query };

        if (this._id) {
            request.uri += `&id=${encodeURIComponent(this._id)}`;
        } else if (this._ids) {
            request = GetDocumentsCommand.prepareRequestWithMultipleIds(request, this._ids);
        }

        return request;
    }

    public static prepareRequestWithMultipleIds(request: HttpRequestBase, ids: string[]): HttpRequestBase {
        const uniqueIds = new Set<string>(ids); 

        // if it is too big, we fallback to POST (note that means that we can't use the HTTP cache any longer)
        // we are fine with that, requests to load > 1024 items are going to be rare
        const isGet: boolean = Array.from(uniqueIds)
                            .map(x => x.length)
                            .reduce((result, next) => result + next, 0) < 1024;

        let newUri = request.uri;
        if (isGet) {
            uniqueIds.forEach(x => {
                if (x) {
                    newUri += `&id=${encodeURIComponent(x)}`;
                }
            });

            return { method: "GET", uri: newUri };
        } else {
            const body = JsonSerializer
                .getDefaultForCommandPayload()
                .serialize({ ids: [...uniqueIds] });
            return {
                uri: newUri,
                method: "POST",
                headers: getHeaders() 
                    .withContentTypeJson()
                    .build(),
                body
            };
        }
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this.result = null;
            return;
        }

        // we want entities property casing untouched, so we're not using PascalCase reviver here
        const raw = JsonSerializer.getDefault().deserialize(response);
        this.result = ObjectKeysTransform.camelCase(raw);
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
