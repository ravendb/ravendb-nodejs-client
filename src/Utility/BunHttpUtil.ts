import type { Agent as HttpAgent, IncomingMessage, RequestOptions } from "node:http";
import type { Agent as HttpsAgent } from "node:https";
import type { Readable, Transform } from "node:stream";
import type { ConnectionOptions } from "node:tls";
import { ICertificate } from "../Auth/Certificate.js";
import { throwError } from "../Exceptions/index.js";
import { RuntimeUtil } from "./RuntimeUtil.js";

/**
 * A `fetch` replacement backed by `node:https`, plus the connection pool behind it.
 * The caller owns the transport and must `close()` it.
 */
export interface BunHttpTransport {
    fetch: NodeHttpsFetch;
    close(): void;
}

export interface NodeHttpsFetch {
    (url: string, init?: RequestInit): Promise<Response>;

    /** Unlike the global `fetch`, this fetcher accepts a `node:stream` Readable request body. */
    acceptsNodeStreamBody: true;
}

export type NodeHttpsAgentOptions = ConnectionOptions & { keepAlive: boolean };

/** First Bun whose `node:https` presents a client certificate and honours `ca` (oven-sh/bun#14417). */
const MIN_BUN_MAJOR_MINOR_FOR_PFX = [1, 4];

/** Responses that must not carry a body - the `Response` constructor rejects one. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

interface NodeHttpModules {
    request: typeof import("node:http").request;
    secureRequest: typeof import("node:https").request;
    pipeline: typeof import("node:stream").pipeline;
    zlib: typeof import("node:zlib");
    httpAgent: HttpAgent;
    httpsAgent: HttpsAgent;
    acceptEncoding: string;
}

/**
 * Bun's fetch ignores `tls.pfx` (oven-sh/bun#41958, oven-sh/bun#17543), so a PKCS#12 archive is
 * presented through `node:https`. Decided on the socket options rather than `instanceof
 * PfxCertificate`: the CommonJS and ESM builds have separate class identities.
 */
export function requiresNodeHttpsTransport(certificate: ICertificate): boolean {
    return !!certificate && !!(certificate.toSocketOptions() as { pfx?: unknown }).pfx;
}

/** Throws for a PKCS#12 archive on Bun older than 1.4.0, where neither `fetch` nor `node:https` presents one. */
export function validateBunCertificateSupport(certificate: ICertificate): void {
    if (!requiresNodeHttpsTransport(certificate)) {
        return;
    }

    const version = RuntimeUtil.getBunVersion();

    if (!version || supportsNodeHttpsClientCertificates(version)) {
        return;
    }

    throwError("InvalidOperationException",
        `A PKCS#12 (PFX) client certificate was configured via authOptions, but Bun ${version} `
        + "cannot present one: its fetch ignores the `tls.pfx` option and its node:https ignored "
        + `client certificates before Bun ${MIN_BUN_MAJOR_MINOR_FOR_PFX.join(".")}.0. `
        + `Upgrade to Bun ${MIN_BUN_MAJOR_MINOR_FOR_PFX.join(".")}.0 or newer, or convert the archive `
        + "to PEM (e.g. openssl pkcs12 -in cert.pfx -out cert.pem -nodes) and configure authOptions "
        + "with type \"pem\".");
}

function supportsNodeHttpsClientCertificates(version: string): boolean {
    const [major, minor] = version.split(".").map(part => Number.parseInt(part, 10));

    if (!Number.isInteger(major) || !Number.isInteger(minor)) {
        return true;
    }

    const [minMajor, minMinor] = MIN_BUN_MAJOR_MINOR_FOR_PFX;
    return major > minMajor || (major === minMajor && minor >= minMinor);
}

export function buildNodeHttpsAgentOptions(certificate: ICertificate): NodeHttpsAgentOptions {
    return {
        ...certificate.toSocketOptions(),
        keepAlive: true
    };
}

/** A `fetch`-compatible transport over `node:https`. Does not follow redirects. */
export function createNodeHttpsTransport(certificate: ICertificate): BunHttpTransport {
    const agentOptions = buildNodeHttpsAgentOptions(certificate);

    let loading: Promise<NodeHttpModules> = null;
    let loaded: NodeHttpModules = null;
    let closed = false;

    function load(): Promise<NodeHttpModules> {
        if (!loading) {
            loading = (async () => {
                const http = await import("node:http");
                const https = await import("node:https");
                const stream = await import("node:stream");
                const zlib = await import("node:zlib");

                loaded = {
                    request: http.request,
                    secureRequest: https.request,
                    pipeline: stream.pipeline,
                    zlib,
                    httpAgent: new http.Agent({ keepAlive: true }),
                    httpsAgent: new https.Agent(agentOptions),
                    acceptEncoding: supportedEncodings(zlib).join(", ")
                };

                // close() may have run while the imports were in flight.
                if (closed) {
                    destroyAgents(loaded);
                }

                return loaded;
            })();
        }

        return loading;
    }

    const transportFetch: NodeHttpsFetch = Object.assign(
        async (url: string, init?: RequestInit) => nodeHttpsFetch(await load(), url, init),
        { acceptsNodeStreamBody: true as const });

    return {
        fetch: transportFetch,
        close: () => {
            closed = true;
            if (loaded) {
                destroyAgents(loaded);
            }
        }
    };
}

function destroyAgents(modules: NodeHttpModules): void {
    modules.httpAgent.destroy();
    modules.httpsAgent.destroy();
}

async function nodeHttpsFetch(modules: NodeHttpModules, url: string, init?: RequestInit): Promise<Response> {
    const target = new URL(url);
    const secure = target.protocol !== "http:";
    const method = (init?.method ?? "GET").toUpperCase();
    const signal = init?.signal;

    if (signal?.aborted) {
        throw toAbortError(signal);
    }

    const { payload, stream, headers } = await encodeRequestBody(init, method);

    if (!headers["accept-encoding"]) {
        headers["accept-encoding"] = modules.acceptEncoding;
    }

    const requestOptions: RequestOptions = {
        method,
        headers,
        agent: secure ? modules.httpsAgent : modules.httpAgent
    };

    return new Promise<Response>((resolve, reject) => {
        const request = (secure ? modules.secureRequest : modules.request)(target, requestOptions, res => {
            try {
                resolve(toResponse(modules, res, method, signal));
            } catch (err) {
                res.destroy();
                reject(err);
            }
        });

        const onAbort = () => request.destroy(toAbortError(signal));
        signal?.addEventListener("abort", onAbort, { once: true });
        request.on("close", () => signal?.removeEventListener("abort", onAbort));

        request.on("error", reject);

        if (stream) {
            stream.on("error", err => request.destroy(err));
            stream.pipe(request);
        } else if (payload) {
            request.end(payload);
        } else {
            request.end();
        }
    });
}

async function encodeRequestBody(
    init: RequestInit | undefined,
    method: string): Promise<{ payload: Buffer, stream: Readable, headers: Record<string, string> }> {

    const headers = new Headers(init?.headers ?? {});
    const body = init?.body;
    let payload: Buffer = null;
    let stream: Readable = null;

    if (body !== null && body !== undefined) {
        if (isNodeReadable(body)) {
            stream = body;
        } else if (typeof body === "string") {
            payload = Buffer.from(body, "utf8");
        } else if (Buffer.isBuffer(body)) {
            payload = body;
        } else if (ArrayBuffer.isView(body)) {
            payload = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof ArrayBuffer) {
            payload = Buffer.from(body);
        } else {
            const encoded = new Response(body);
            payload = Buffer.from(await encoded.arrayBuffer());

            const contentType = encoded.headers.get("content-type");
            if (contentType && !headers.has("content-type")) {
                headers.set("content-type", contentType);
            }
        }
    }

    // fetch always sends a content-length; only a streamed body stays chunked.
    if (payload) {
        headers.set("content-length", String(payload.length));
    } else if (!stream && method !== "GET" && method !== "HEAD") {
        headers.set("content-length", "0");
    }

    const outgoing: Record<string, string> = {};
    headers.forEach((value, name) => outgoing[name] = value);

    return { payload, stream, headers: outgoing };
}

// Duck-typed: the Readable may come from another copy of node:stream (CommonJS vs ESM build).
function isNodeReadable(body: unknown): body is Readable {
    const candidate = body as Readable;
    return !!candidate && typeof candidate.pipe === "function" && typeof candidate.on === "function";
}

function toResponse(modules: NodeHttpModules, res: IncomingMessage, method: string, signal: AbortSignal): Response {
    const status = res.statusCode;
    const headers = new Headers();

    for (const [name, value] of Object.entries(res.headers)) {
        if (value === undefined) {
            continue;
        }

        if (Array.isArray(value)) {
            value.forEach(entry => headers.append(name, entry));
        } else {
            headers.append(name, value);
        }
    }

    if (method === "HEAD" || NULL_BODY_STATUSES.has(status)) {
        res.resume();
        return new Response(null, { status, statusText: res.statusMessage, headers });
    }

    const decompressor = createDecompressor(modules.zlib, res.headers["content-encoding"]);
    let stream: Readable = res;

    if (decompressor) {
        headers.delete("content-encoding");
        headers.delete("content-length");
        modules.pipeline(res, decompressor, () => { /* handled via the decompressor's error event */ });
        stream = decompressor;
    }

    return new Response(toWebStream(stream, signal), { status, statusText: res.statusMessage, headers });
}

function supportedEncodings(zlib: typeof import("node:zlib")): string[] {
    const encodings = ["gzip", "deflate", "br"];

    if (typeof zlib.createZstdDecompress === "function") {
        encodings.push("zstd");
    }

    return encodings;
}

function createDecompressor(zlib: typeof import("node:zlib"), encoding: string | string[]): Transform {
    const name = (Array.isArray(encoding) ? encoding[0] : encoding ?? "").trim().toLowerCase();

    switch (name) {
        case "gzip":
        case "x-gzip":
            return zlib.createGunzip();
        case "deflate":
            return zlib.createInflate();
        case "br":
            return zlib.createBrotliDecompress();
        case "zstd":
            return typeof zlib.createZstdDecompress === "function" ? zlib.createZstdDecompress() : null;
        default:
            return null;
    }
}

function toWebStream(stream: Readable, signal: AbortSignal): ReadableStream<Uint8Array> {
    let finished = false;

    return new ReadableStream<Uint8Array>({
        start(controller) {
            stream.on("data", (chunk: Buffer) => {
                if (finished) {
                    return;
                }

                try {
                    controller.enqueue(new Uint8Array(chunk));
                } catch {
                    // the consumer cancelled between two chunks
                    finished = true;
                    stream.destroy();
                    return;
                }

                if (controller.desiredSize !== null && controller.desiredSize <= 0) {
                    stream.pause();
                }
            });

            stream.on("end", () => {
                if (!finished) {
                    finished = true;
                    controller.close();
                }
            });

            stream.on("error", err => {
                if (!finished) {
                    finished = true;
                    controller.error(signal?.aborted ? toAbortError(signal) : err);
                }
            });
        },
        pull() {
            stream.resume();
        },
        cancel() {
            finished = true;
            stream.destroy();
        }
    });
}

function toAbortError(signal: AbortSignal): Error {
    const reason = signal?.reason;

    if (reason instanceof Error) {
        return reason;
    }

    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    return error;
}
