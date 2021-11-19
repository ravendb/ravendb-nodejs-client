import * as stream from "readable-stream";
import { RavenCommand } from "../../../Http/RavenCommand";
import { GetResponse } from "./GetResponse";
import { HttpCache, ReleaseCacheItem } from "../../../Http/HttpCache";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { GetRequest } from "./GetRequest";
import { ServerNode } from "../../../Http/ServerNode";
import { StatusCodes } from "../../../Http/StatusCode";
import { getEtagHeader } from "../../../Utility/HttpUtil";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";
import { IDisposable } from "../../../Types/Contracts";
import { RequestExecutor } from "../../../Http/RequestExecutor";
import { AggressiveCacheOptions } from "../../../Http/AggressiveCacheOptions";
import { HEADERS } from "../../../Constants";

export class MultiGetCommand extends RavenCommand<GetResponse[]> implements IDisposable {
    private readonly _requestExecutor: RequestExecutor;
    private _httpCache: HttpCache;
    private readonly _commands: GetRequest[];
    private _conventions: DocumentConventions;
    private _baseUrl: string;
    private _cached: Cached;

    aggressivelyCached: boolean;

    public constructor(requestExecutor: RequestExecutor, conventions: DocumentConventions, commands: GetRequest[]) {
        super();

        this._requestExecutor = requestExecutor;
        if (!requestExecutor) {
            throwError("InvalidArgumentException", "RequestExecutor cannot be null");
        }

        this._httpCache = requestExecutor.cache;

        if (!commands) {
            throwError("InvalidArgumentException", "Commands cannot be null");
        }

        this._commands = commands;
        this._conventions = conventions;
        this._responseType = "Raw";
    }

    private _getCacheKey(command: GetRequest): string {
        const url = this._baseUrl + command.urlAndQuery;
        return (command.method || "GET") + "-" + url;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        this._baseUrl = node.url + "/databases/" + node.database;

        const requests = [];
        const bodyObj = { Requests: requests };
        const request: HttpRequestParameters = {
            uri: this._baseUrl + "/multi_get",
            method: "POST",
            headers: this._headers().typeAppJson().build(),
        };

        if (this._maybeReadAllFromCache(this._requestExecutor.aggressiveCaching)) {
            this.aggressivelyCached = true;
            return null; // aggressively cached
        }

        for (const command of this._commands) {
            const req = {
                Url: "/databases/" + node.database + command.url,
                Query: command.query,
                Method: command.method || "GET",
                Headers: command.headers,
                Content: command.body
            };

            requests.push(req);
        }

        request.body = JSON.stringify(bodyObj);

        return request;
    }

    private _maybeReadAllFromCache(options: AggressiveCacheOptions) {
        this.closeCache();

        let readAllFromCache = !!options;

        for (let i = 0; i < this._commands.length; i++) {
            const command = this._commands[i];
            const cacheKey = this._getCacheKey(command);

            let changeVector: string;
            let cachedRef: string;

            const cachedItem = this._httpCache.get(cacheKey, c => {
                changeVector = c.changeVector;
                cachedRef = c.response;
            });

            if (!cachedItem.item) {
                readAllFromCache = false;
                continue;
            }

            if (readAllFromCache && cachedItem.age > options.duration || !command.canCacheAggressively) {
                readAllFromCache = false;
            }

            command.headers[HEADERS.IF_NONE_MATCH] = changeVector;

            if (!this._cached) {
                this._cached = new Cached(this._commands.length);
            }

            this._cached.values[i] = [cachedItem, cachedRef];
        }

        if (readAllFromCache) {
            try {
                this.result = [];

                for (let i = 0; i < this._commands.length; i++) {
                    const itemAndCached = this._cached.values[i];
                    const getResponse = new GetResponse();
                    getResponse.result = itemAndCached[1];
                    getResponse.statusCode = StatusCodes.NotModified;

                    this.result.push(getResponse);
                }
            } finally {
                this._cached.dispose();
            }

            this._cached = null;
        }

        return readAllFromCache;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }
        try {
            const result = await this._pipeline<GetResponse[]>()
                .parseJsonAsync()
                .jsonKeysTransform({
                    getCurrentTransform(key, stack) {
                        if (stack.length === 1
                            || stack.length === 2
                            || stack.length === 3) {
                            // results.0.result
                            return "camel";
                        }

                        return null;
                    }
                })
                .process(bodyStream);

            const responses = result["results"].reduce((result: GetResponse[], next) => {
                // TODO try to get it directly from parser
                next.result = JSON.stringify(next.result);
                return [...result, next];
            }, []);

            this.result = [];

            for (let i = 0; i < responses.length; i++) {
                const res = responses[i];
                const command = this._commands[i];
                this._maybeSetCache(res, command);

                if (this._cached && res.statusCode === StatusCodes.NotModified) {
                    const clonedResponse = new GetResponse();
                    clonedResponse.result = this._cached.values[i][1];
                    clonedResponse.statusCode = StatusCodes.NotModified;
                    this.result.push(clonedResponse);
                } else {
                    this.result.push(GetResponse.create(res));
                }
            }

            return null;
        } finally {
            if (this._cached) {
                this._cached.dispose();
            }
        }
    }

    private _maybeSetCache(getResponse: GetResponse, command: GetRequest): void {
        if (getResponse.statusCode === StatusCodes.NotModified) {
            return;
        }

        const cacheKey = this._getCacheKey(command);
        const result = getResponse.result;
        if (!result) {
            this._httpCache.setNotFound(cacheKey);
            return;
        }

        const changeVector = getEtagHeader(getResponse.headers);
        if (!changeVector) {
            return;
        }

        this._httpCache.set(cacheKey, changeVector, result);
    }

    public get isReadRequest(): boolean {
        return false;
    }

    dispose(): void {
        this.closeCache();
    }

    public closeCache() {
        if (this._cached) {
            this._cached.dispose();
        }

        this._cached = null;
    }
}

class Cached implements IDisposable {
    private readonly _size: number;

    public values: [ReleaseCacheItem, string][];

    public constructor(size: number) {
        this._size = size;
        this.values = new Array(size);
    }

    dispose(): void {
        if (!this.values) {
            return;
        }

        this.values = null;
    }
}