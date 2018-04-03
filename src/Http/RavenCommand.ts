import { ServerNode } from "./ServerNode";
import { HttpCache } from "../Http/HttpCache";
import { StatusCodes } from "../Http/StatusCode";
import { RequestPromise, RequestPromiseOptions } from "request-promise";
import { Promise as BluebirdPromise } from "bluebird";
import { UriOptions } from "request";
import * as HttpExtensions from "../Extensions/HttpExtensions";
import * as request from "request-promise";
import { HttpRequestBase, HttpResponse } from "../Primitives/Http";
import { getLogger } from "../Utility/LogUtil";
import { ObjectMapper } from "../Utility/Mapping";
import { throwError, RavenErrorType } from "../Exceptions/ClientErrors";

const log = getLogger({ name: "RavenCommand" });

export type RavenCommandResponseType = "EMPTY" | "OBJECT" | "RAW";

export type ResponseDisposeHandling = "AUTOMATIC" | "MANUALLY";

export abstract class RavenCommand<TResult> {

    // protected final Class<TResult> resultClass;
    protected _result: TResult;
    protected _statusCode: number;
    protected _responseType: RavenCommandResponseType;
    protected _canCache: boolean;
    protected _canCacheAggressively: boolean;

    protected mapper: ObjectMapper;

    public abstract get isReadRequest(): boolean;

    public get responseType() {
        return this.responseType;
    }

    public get statusCode(): number {
        return this._statusCode;
    }

    public set statusCode(value) {
        this._statusCode = value;
    }

    public get result(): TResult {
        return this.result;
    }

    public set result(value) {
        this._result = value;
    }

    public get canCache(): boolean {
        return this._canCache;
    }

    public get canCacheAggressively(): boolean {
        return this._canCacheAggressively;
    }

    private _failedNodes: Map<ServerNode, Error>;

    public get failedNodes() {
        return this._failedNodes;
    }

    public set failedNodes(value) {
        this.failedNodes = value;
    }

    constructor() {
        this._responseType = "OBJECT";
        this._canCache = true;
        this._canCacheAggressively = true;
    }

    public abstract createRequest(node: ServerNode): HttpRequestBase;

    public setResponse(response: string, fromCache: boolean): void {
        if (this._responseType === "EMPTY"
            || this._responseType === "RAW") {
            this.throwInvalidResponse();
        }

        throwError(this.constructor.name +
            " command must override the setResponse method which expects response with the following type: " +
            this._responseType, "NotSupportedException");
    }

    public send(requestOptions: HttpRequestBase): RequestPromise {
        return request(requestOptions);
    }

    public setResponseRaw(response: HttpResponse, body: string): void {
        throwError(
            "When " + this._responseType + " is set to RAW then please override this method to handle the response.",
            "NotSupportedException");
    }

    protected throwInvalidResponse(): void {
        throwError("Response is invalid", "InvalidOperationException");
    }

    protected urlEncode(value): string {
        return encodeURIComponent(value);
    }

    public static ensureIsNotNullOrEmpty(value: string, name: string): void {
        if (!value) {
            throwError(name + " cannot be null or empty", "InvalidArgumentException");
        }
    }

    public isFailedWithNode(node: ServerNode): boolean {
        return this._failedNodes
            && !!this._failedNodes.get(node);
    }

    public processResponse(
        cache: HttpCache, response: HttpResponse, url: string): ResponseDisposeHandling {
        const responseEntity = response.body;

        if (!responseEntity) {
            return "AUTOMATIC";
        }

        if (this._responseType === "EMPTY" ||
            response.statusCode === StatusCodes.NoContent) {
            return "AUTOMATIC";
        }

        try {
            if (this._responseType === "OBJECT") {
                const contentLength: number = parseInt(response.caseless.get("content-length"), 10);
                if (contentLength === 0) {
                    response.destroy(); // not sure
                    return "AUTOMATIC";
                }

                // we intentionally don't dispose the reader here, we'll be using it
                // in the command, any associated memory will be released on context reset
                // JAVA String json = IOUtils.toString(responseEntity.getContent(), "UTF-8");
                const json = response.body;
                // TODO what is type of body

                if (cache) {
                    // this._cacheResponse(cache, url, response, json);
                }

                this.setResponse(json, false);

                return "AUTOMATIC";
            } else {
                this.setResponseRaw(response, response.body);
            }

            return "AUTOMATIC";
        } catch (err) {
            log.warn(err, "Error processing command response.");
            return "AUTOMATIC";
        } finally {
            response.destroy();
        }
    }

    protected cacheResponse(cache: HttpCache, url: string, response: HttpResponse, responseJson: string): void {
        if (!this.canCache) {
            return;
        }

        const changeVector = HttpExtensions.getEtagHeader(response);
        if (!changeVector) {
            return;
        }

        cache.set(url, changeVector, responseJson);
    }

    protected addChangeVectorIfNotNull(changeVector: string, req: HttpRequestBase): void {
        if (changeVector) {
            req.headers["If-Match"] = `"${changeVector}"`;
        }
    }

    // tslint:disable-next-line:no-empty
    public onResponseFailure(response: HttpResponse): void { }
}
