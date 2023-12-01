import { ServerNode } from "./ServerNode";
import { HttpCache } from "./HttpCache";
import { StatusCodes } from "./StatusCode";
import * as stream from "readable-stream";
import { Response, default as fetch, RequestInit } from "node-fetch";
import { HttpRequestParameters, HttpResponse } from "../Primitives/Http";
import { getLogger } from "../Utility/LogUtil";
import { throwError } from "../Exceptions";
import { IRavenObject } from "../Types/IRavenObject";
import { getEtagHeader, HeadersBuilder, closeHttpResponse } from "../Utility/HttpUtil";
import { TypeInfo } from "../Mapping/ObjectMapper";
import { JsonSerializer } from "../Mapping/Json/Serializer";
import { RavenCommandResponsePipeline } from "./RavenCommandResponsePipeline";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";
import * as http from "http";
import { ObjectTypeDescriptor } from "../Types";
import { ReadableWebToNodeStream } from "../Utility/ReadableWebToNodeStream";
import { LengthUnawareFormData } from "../Utility/LengthUnawareFormData";
import { Stream } from "readable-stream";

const log = getLogger({ module: "RavenCommand" });

export type RavenCommandResponse = string | Response;

export type RavenCommandResponseType = "Empty" | "Object" | "Raw";

export type ResponseDisposeHandling = "Automatic" | "Manually";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IRavenResponse extends IRavenObject {
}

export abstract class RavenCommand<TResult> {

    // protected final Class<TResult> resultClass;
    public result: TResult;
    public statusCode: number;
    public failedNodes: Map<ServerNode, Error>;
    protected _responseType: RavenCommandResponseType;
    public timeout: number | undefined;
    protected _canCache: boolean;
    protected _canCacheAggressively: boolean;
    protected _selectedNodeTag: string;
    protected _numberOfAttempts: number;

    public failoverTopologyEtag = -2;

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

    public get selectedNodeTag(): string {
        return this._selectedNodeTag;
    }

    public get numberOfAttempts(): number {
        return this._numberOfAttempts;
    }

    public set numberOfAttempts(value: number) {
        this._numberOfAttempts = value;
    }

    constructor(copy?: RavenCommand<TResult>) {
        if (copy instanceof RavenCommand) {
            this._canCache = copy._canCache;
            this._canCacheAggressively = copy._canCacheAggressively;
            this._selectedNodeTag = copy._selectedNodeTag;
            this._responseType = copy._responseType;
        } else {
            this._responseType = "Object";
            this._canCache = true;
            this._canCacheAggressively = true;
        }
    }

    public abstract createRequest(node: ServerNode): HttpRequestParameters;

    protected get _serializer(): JsonSerializer {
        return JsonSerializer.getDefaultForCommandPayload();
    }

    public async setResponseFromCache(cachedValue: string): Promise<void> {
        if (!cachedValue) {
            this.result = null;
            return;
        }
        const readable = new stream.Readable();
        readable.push(cachedValue);
        readable.push(null);
        await this.setResponseAsync(readable, true);
    }

    protected _defaultPipeline<T = TResult>(
        bodyCallback?: (body: string) => void): RavenCommandResponsePipeline<T> {
        return this._pipeline<T>()
            .parseJsonSync()
            .collectBody(bodyCallback)
            .objectKeysTransform("camel");
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (this._responseType === "Empty" || this._responseType === "Raw") {
            this._throwInvalidResponse();
        }

        return throwError("NotSupportedException",
            this.constructor.name +
            " command must override the setResponseAsync()" +
            " method which expects response with the following type: " +
            this._responseType);
    }

    public async send(agent: http.Agent,
        requestOptions: HttpRequestParameters): Promise<{ response: HttpResponse, bodyStream: stream.Readable }> {

        const { body, uri, fetcher, ...restOptions } = requestOptions;

        log.info(`Send command ${this.constructor.name} to ${uri}${body ? " with body " + body : ""}.`);

        if (requestOptions.agent) { // support for fiddler
            agent = requestOptions.agent as http.Agent;
        }

        const bodyToUse = fetcher ? RavenCommand.maybeWrapBody(body) : body;

        const optionsToUse = { body: bodyToUse, ...restOptions, agent } as RequestInit;

        const passthrough = new stream.PassThrough();
        passthrough.pause();

        const fetchFn = fetcher ?? fetch; // support for custom fetcher
        const response = await fetchFn(uri, optionsToUse);

        const effectiveStream: stream.Readable =
            fetcher && response.body
                ? new ReadableWebToNodeStream(response.body)
                : (response.body ?? new Stream());

        effectiveStream
            .pipe(passthrough);

        return {
            response,
            bodyStream: passthrough
        };
    }

    private static maybeWrapBody(body: any) {
        if (body instanceof LengthUnawareFormData) {
            throw new Error("Requests using FormData as payload are not yet supported!");
        }
        if (body instanceof stream.Readable) {
            throw new Error("Requests using stream.Readable as payload are not yet supported!");
        }

        return body;
    }

    public setResponseRaw(response: HttpResponse, body: string): void {
        throwError("NotSupportedException",
            "When _responseType is set to RAW then please override this method to handle the response.");
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

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: stream.Readable,
        url: string): Promise<ResponseDisposeHandling> {
        if (!response) {
            return "Automatic";
        }

        if (this._responseType === "Empty" ||
            response.status === StatusCodes.NoContent) {
            return "Automatic";
        }

        try {
            if (this._responseType === "Object") {
                const contentLength: number = parseInt(response.headers.get("content-length"), 10);
                if (contentLength === 0) {
                    closeHttpResponse(response);
                    return "Automatic";
                }

                const bodyPromise = this.setResponseAsync(bodyStream, false);
                bodyStream.resume();
                const body = await bodyPromise;

                if (cache) {
                    this._cacheResponse(cache, url, response, body);
                }

                return "Automatic";
            } else {
                const bodyPromise = this.setResponseAsync(bodyStream, false);
                bodyStream.resume();
                await bodyPromise;
            }

            return "Automatic";
        } catch (err) {
            log.error(err, `Error processing command ${this.constructor.name} response.`);
            throwError("RavenException",
                `Error processing command ${this.constructor.name} response: ${err.stack}`, err);
        } finally {
            closeHttpResponse(response);
            // response.destroy();
            // since we're calling same hosts and port a lot, we might not want to destroy sockets explicitly
            // they're going to get back to Agent's pool and reused
        }

        return "Automatic";
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

    protected _addChangeVectorIfNotNull(changeVector: string, req: HttpRequestParameters): void {
        if (changeVector) {
            req.headers["If-Match"] = `"${changeVector}"`;
        }
    }

    protected _reviveResultTypes<TResponse extends object>(
        raw: object,
        conventions: DocumentConventions,
        typeInfo?: TypeInfo,
        knownTypes?: Map<string, ObjectTypeDescriptor>) {
        return conventions.objectMapper.fromObjectLiteral<TResponse>(raw, typeInfo, knownTypes);
    }

    protected async _parseResponseDefaultAsync(bodyStream: stream.Stream): Promise<string> {
        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _).process(bodyStream);
        return body;
    }

    protected _headers() {
        return HeadersBuilder.create();
    }

    protected _throwInvalidResponse(): void {
        throwError("InvalidOperationException", "Response is invalid");
    }

    protected static _throwInvalidResponse(cause: Error): void {
        throwError("InvalidOperationException", "Response is invalid: " + cause.message, cause);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public onResponseFailure(response: HttpResponse): void {
    }

    protected _pipeline<TPipelineResult>() {
        return RavenCommandResponsePipeline.create<TPipelineResult>();
    }
}
