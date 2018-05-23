import { ServerNode } from "./ServerNode";
import { HttpCache } from "../Http/HttpCache";
import { StatusCodes } from "../Http/StatusCode";
import { RequestPromise, RequestPromiseOptions } from "request-promise";
import { Promise as BluebirdPromise } from "bluebird";
import { UriOptions } from "request";
import * as request from "request-promise";
import { HttpRequestBase, HttpResponse } from "../Primitives/Http";
import { getLogger } from "../Utility/LogUtil";
import { throwError } from "../Exceptions";
import { IRavenObject } from "../Types/IRavenObject";
import { getEtagHeader, HeadersBuilder } from "../Utility/HttpUtil";
import { Mapping } from "../Mapping";
import { TypesAwareObjectMapper, TypeInfo } from "../Mapping/ObjectMapper";
import { ObjectTypeDescriptor } from "..";
import { JsonSerializer } from "../Mapping/Json/Serializer";

const log = getLogger({ module: "RavenCommand" });

export type RavenCommandResponseType = "EMPTY" | "OBJECT" | "RAW";

export type ResponseDisposeHandling = "AUTOMATIC" | "MANUALLY";

// tslint:disable-next-line:no-empty-interface
export interface IRavenResponse extends IRavenObject {}

export abstract class RavenCommand<TResult> {

    // protected final Class<TResult> resultClass;
    public result: TResult;
    public statusCode: number;
    public failedNodes: Map<ServerNode, Error>;
    protected _responseType: RavenCommandResponseType;
    protected _canCache: boolean;
    protected _canCacheAggressively: boolean;

    protected _typedObjectMapper: TypesAwareObjectMapper = Mapping.getDefaultMapper();

    public abstract get isReadRequest(): boolean;

    public get responseType() {
        return this._responseType;
    }

    public get canCache(): boolean {
        return this._canCache;
    }

    public get canCacheAggressively(): boolean {
        return this._canCacheAggressively;
    }

    constructor() {
        this._responseType = "OBJECT";
        this._canCache = true;
        this._canCacheAggressively = true;
    }

    public abstract createRequest(node: ServerNode): HttpRequestBase;

    protected get _serializer(): JsonSerializer {
        return JsonSerializer.getDefaultForCommandPayload();
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (this._responseType === "EMPTY"
            || this._responseType === "RAW") {
            this._throwInvalidResponse();
        }

        throwError("NotSupportedException", 
            this.constructor.name +
            " command must override the setResponse method which expects response with the following type: " +
            this._responseType);
    }

    public send(requestOptions: HttpRequestBase): Promise<HttpResponse> {
        const { body, uri } = requestOptions;
        log.info(`Send command ${this.constructor.name} to ${uri}${body ? " with body " + body : ""}.`);
        return Promise.resolve(request(requestOptions));
    }

    public setResponseRaw(response: HttpResponse, body: string): void {
        throwError("NotSupportedException",
            "When " + this._responseType + " is set to RAW then please override this method to handle the response.");
    }

    protected _throwInvalidResponse(): void {
        throwError("InvalidOperationException", "Response is invalid");
    }

    protected _urlEncode(value): string {
        return encodeURIComponent(value);
    }

    public static ensureIsNotNullOrEmpty(value: string, name: string): void {
        if (!value) {
            throwError("InvalidArgumentException", name + " cannot be null or empty");
        }
    }

    public isFailedWithNode(node: ServerNode): boolean {
        return this.failedNodes
            && !!this.failedNodes.get(node);
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
                const { body } = response;

                if (cache) {
                    // TODO 
                    //this._cacheResponse(cache, url, response, json);
                }

                this.setResponse(body as string, false);

                return "AUTOMATIC";
            } else {
                this.setResponseRaw(response, response.body);
            }

            return "AUTOMATIC";
        } catch (err) {
            log.error(err, `Error processing command ${this.constructor.name} response.`);
            throwError("RavenException", `Error processing command ${this.constructor.name} response.`, err);
        } finally {
            response.destroy();
        }

        return "AUTOMATIC";
    }

    protected _cacheResponse(cache: HttpCache, url: string, response: HttpResponse, responseJson: string): void {
        if (!this.canCache) {
            return;
        }

        const changeVector = getEtagHeader(response);
        if (!changeVector) {
            return;
        }

        cache.set(url, changeVector, responseJson);
    }

    protected _addChangeVectorIfNotNull(changeVector: string, req: HttpRequestBase): void {
        if (changeVector) {
            req.headers["If-Match"] = `"${changeVector}"`;
        }
    }

    protected _parseResponseDefault<TResponse extends object>(
        response: string, typeInfo?: TypeInfo, knownTypes?: Map<string, ObjectTypeDescriptor>) {
        const res = this._serializer.deserialize(response);
        const resObj = this._typedObjectMapper.fromObjectLiteral<TResponse>(res, typeInfo, knownTypes);
        return resObj;
    }

    protected _getHeaders() {
        return HeadersBuilder.create();
    }

    // tslint:disable-next-line:no-empty
    public onResponseFailure(response: HttpResponse): void { }
}
