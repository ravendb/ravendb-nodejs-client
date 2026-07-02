import { ServerNode } from "./ServerNode.js";
import { HttpCache } from "./HttpCache.js";
import { StatusCodes } from "./StatusCode.js";
import { Stream, Readable, PassThrough } from "node:stream";
import { HttpRequestParameters, HttpResponse } from "../Primitives/Http.js";
import { getLogger } from "../Utility/LogUtil.js";
import { getError, throwError } from "../Exceptions/index.js";
import { IRavenObject } from "../Types/IRavenObject.js";
import { getEtagHeader, HeadersBuilder, closeHttpResponse } from "../Utility/HttpUtil.js";
import { TypeInfo } from "../Mapping/ObjectMapper.js";
import { JsonSerializer } from "../Mapping/Json/Serializer.js";
import { RavenCommandResponsePipeline } from "./RavenCommandResponsePipeline.js";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions.js";
import { ObjectTypeDescriptor } from "../Types/index.js";
import { ObjectUtil } from "../Utility/ObjectUtil.js";
import { Dispatcher } from "undici-types";
import { HEADERS } from "../Constants.js";
import { DefaultCommandResponseBehavior } from "./Behaviors/DefaultCommandResponseBehavior.js";
import { RuntimeUtil } from "../Utility/RuntimeUtil.js";
import { BunFetchRequestInit } from "../Types/BunTypes.js";

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
    protected _canReadFromCache: boolean = true;
    protected _selectedNodeTag: string;
    private _selectedShardNumber: number;
    protected _numberOfAttempts: number;

    public failoverTopologyEtag = -2;

    protected _etag: string;

    public get responseBehavior() {
        return DefaultCommandResponseBehavior.INSTANCE;
    }

    public abstract get isReadRequest(): boolean;

    public get responseType() {
        return this._responseType;
    }

    public set etag(value: string) {
        this._etag = value;
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

    public set selectedNodeTag(nodeTag: string) {
        this._selectedNodeTag = nodeTag;
    }

    get selectedShardNumber(): number {
        return this._selectedShardNumber;
    }

    set selectedShardNumber(value: number) {
        this._selectedShardNumber = value;
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
            this._canReadFromCache = copy._canReadFromCache;
            this._canCacheAggressively = copy._canCacheAggressively;
            this._selectedNodeTag = copy._selectedNodeTag;
            this._selectedShardNumber = copy.selectedShardNumber;
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
        const readable = new Readable();
        readable.push(cachedValue);
        readable.push(null);
        await this.setResponseAsync(readable, true);
    }

    protected _defaultPipeline<T = TResult>(
        bodyCallback?: (body: string) => void): RavenCommandResponsePipeline<T> {
        return this._pipeline<T>()
            .parseJsonSync()
            .collectBody(bodyCallback)
            .objectKeysTransform(ObjectUtil.camel);
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (this._responseType === "Empty" || this._responseType === "Raw") {
            this._throwInvalidResponse();
        }

        return throwError("NotSupportedException",
            this.constructor.name +
            " command must override the setResponseAsync()" +
            " method which expects response with the following type: " +
            this._responseType);
    }

    public async send(agent: Dispatcher,
        requestOptions: HttpRequestParameters): Promise<{ response: HttpResponse, bodyStream: Readable }> {

        const { body, uri, fetcher, ...restOptions } = requestOptions;

        log.info(`Send command ${this.constructor.name} to ${uri}${body ? " with body " + body : ""}.`);

        const bodyToUse = fetcher ? RavenCommand.maybeWrapBody(body) : body;

        let optionsToUse: RequestInit | BunFetchRequestInit;

        if (RuntimeUtil.isBun()) {
            optionsToUse = { body: bodyToUse, ...restOptions } as BunFetchRequestInit;
        } else if (RuntimeUtil.isWorkerd()) {
            // Cloudflare Workers' fetch has no undici `dispatcher` concept; mTLS is
            // handled by the custom fetch (an mtls_certificate binding). Passing a
            // dispatcher here is meaningless and can confuse the runtime.
            optionsToUse = { body: bodyToUse, ...restOptions } as RequestInit;
        } else {
            if (requestOptions.dispatcher) { // support for fiddler
                agent = requestOptions.dispatcher;
            }
            optionsToUse = { body: bodyToUse, ...restOptions, dispatcher: agent } as RequestInit;
        }

        let passthrough: PassThrough;
        try {
            passthrough = new PassThrough();
        } catch (err) {
            throw RavenCommand._maybeNodeStreamUnavailableError(err as Error);
        }
        passthrough.pause();

        const fetchFn = fetcher ?? fetch; // support for custom fetcher
        const response = await fetchFn(uri, optionsToUse);

        const effectiveStream: Stream =
            response.body
                ? Readable.fromWeb(response.body)
                : new Stream();

        effectiveStream
            .pipe(passthrough);

        return {
            response,
            bodyStream: passthrough
        };
    }

    private static _maybeNodeStreamUnavailableError(err: Error): Error {
        // Some edge bundlers ship an incomplete `node:stream` where PassThrough throws
        // "not implemented" (e.g. Nitro/unenv, used by TanStack Start & Nuxt). Turn that
        // cryptic stub error into an actionable one pointing at the real fix.
        if (RuntimeUtil.isWorkerd()) {
            return getError(
                "InvalidOperationException",
                "The RavenDB client requires a working node:stream on Cloudflare Workers, but this "
                + "runtime provided an incomplete polyfill. Enable Node.js compatibility by adding "
                + `compatibility_flags = ["nodejs_compat"] (and a recent compatibility_date) to your `
                + "wrangler configuration. For framework bundlers such as Nitro / TanStack Start / Nuxt "
                + "this makes node: built-ins resolve to the workerd runtime instead of unenv stubs.",
                err);
        }
        return err;
    }

    private static maybeWrapBody(body: any) {
        if (body instanceof Readable) {
            throw new Error("Requests using stream.Readable as payload are not yet supported!");
        }

        return body;
    }

    public setResponseRaw(response: HttpResponse, body: string): void {
        throwError("NotSupportedException",
            "When _responseType is set to RAW then please override this method to handle the response.");
    }

    protected _urlEncode(value: string | number | boolean): string {
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
        bodyStream: Readable,
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
                const contentLength: number = Number.parseInt(response.headers.get("content-length"), 10);
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
            req.headers[HEADERS.IF_MATCH] = `"${changeVector}"`;
        }
    }

    protected _reviveResultTypes<TResponse extends object>(
        raw: object,
        conventions: DocumentConventions,
        typeInfo?: TypeInfo,
        knownTypes?: Map<string, ObjectTypeDescriptor>) {
        return conventions.objectMapper.fromObjectLiteral<TResponse>(raw, typeInfo, knownTypes);
    }

    protected async _parseResponseDefaultAsync(bodyStream: Stream): Promise<string> {
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
        throwError("InvalidOperationException", "Response is invalid: " + cause, (cause as any).message, cause);
    }

    public onResponseFailure(response: HttpResponse): void {
        // empty
    }

    protected _pipeline<TPipelineResult>() {
        return RavenCommandResponsePipeline.create<TPipelineResult>();
    }
}
