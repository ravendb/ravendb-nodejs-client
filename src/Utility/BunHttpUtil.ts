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

    /**
     * Marks this fetcher as accepting a `node:stream` Readable request body, which the
     * global `fetch` does not. RavenCommand.send checks it before rejecting the streamed
     * attachment payloads PutAttachmentOperation produces.
     */
    acceptsNodeStreamBody: true;
}

export type NodeHttpsAgentOptions = ConnectionOptions & { keepAlive: boolean };

/**
 * First Bun whose `node:https` presents a client certificate (and honours `ca`) at all.
 * Bun 1.3.x ignores both, so the PKCS#12 path has nothing to fall back to there.
 */
const MIN_BUN_MAJOR_MINOR_FOR_PFX = [1, 4];

/** Responses that must not carry a body - the `Response` constructor rejects one. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

interface NodeHttpModules {
    request: typeof import("node:http").request;
    secureRequest: typeof import("node:https").request;
    zlib: typeof import("node:zlib");
    httpAgent: HttpAgent;
    httpsAgent: HttpsAgent;
}

/**
 * Whether the configured certificate has to be presented through `node:https` instead of
 * Bun's own `fetch`. Bun's `fetch` accepts only PEM material in its `tls` option (`cert`,
 * `key`, `ca`) - a `pfx` there is silently ignored, so the request goes out uncertified
 * and comes back as a bare 401/403 (oven-sh/bun#41958, oven-sh/bun#17543). Its
 * `node:https` implementation does honour `pfx` (oven-sh/bun#14417, fixed in Bun 1.4.x),
 * which is why a PKCS#12 archive is routed there and PEM material is not.
 *
 * Decided on the TLS options the certificate produces rather than `instanceof
 * PfxCertificate`: the package ships both a CommonJS and an ESM build, and a certificate
 * built from the other one would silently fail the identity check and go out uncertified.
 */
export function requiresNodeHttpsTransport(certificate: ICertificate): boolean {
    return !!certificate && !!(certificate.toSocketOptions() as { pfx?: unknown }).pfx;
}

/**
 * Throws when a PKCS#12 archive is configured on a Bun too old to present it: before
 * Bun 1.4.0 neither transport works - `fetch` ignores `tls.pfx` and `node:https` drops
 * the client certificate (and the `ca`) as well. Called from
 * RequestExecutor.validateCertificateRuntimeSupport at DocumentStore.initialize(), so the
 * misconfiguration surfaces at startup instead of as an opaque TLS failure per request.
 */
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
        // An unreadable version is not evidence of an old runtime - let the request path
        // decide rather than refusing to start.
        return true;
    }

    const [minMajor, minMinor] = MIN_BUN_MAJOR_MINOR_FOR_PFX;
    return major > minMajor || (major === minMajor && minor >= minMinor);
}

/**
 * The `node:https.Agent` options presenting the configured client certificate.
 * `toSocketOptions()` already produces exactly the TLS shape an Agent takes.
 */
export function buildNodeHttpsAgentOptions(certificate: ICertificate): NodeHttpsAgentOptions {
    return {
        ...certificate.toSocketOptions(),
        keepAlive: true
    };
}

/**
 * Builds a `fetch`-compatible transport that issues requests through `node:https`, so a
 * PKCS#12 client certificate is actually presented on Bun (see requiresNodeHttpsTransport).
 * It is installed as the request `fetcher`, the same seam `conventions.customFetch` uses.
 *
 * Covers what the client asks of `fetch`: methods, headers, string/binary/FormData bodies,
 * streamed response bodies, `AbortSignal`, and content-encoding decompression. It does NOT
 * follow redirects - the RavenDB API does not use them, and silently re-issuing a request
 * elsewhere is worse than surfacing the 3xx.
 */
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
                const zlib = await import("node:zlib");

                loaded = {
                    request: http.request,
                    secureRequest: https.request,
                    zlib,
                    httpAgent: new http.Agent({ keepAlive: true }),
                    httpsAgent: new https.Agent(agentOptions)
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

    const requestOptions: RequestOptions = {
        method,
        headers,
        agent: secure ? modules.httpsAgent : modules.httpAgent
    };

    return new Promise<Response>((resolve, reject) => {
        const request = (secure ? modules.secureRequest : modules.request)(target, requestOptions, res => {
            try {
                resolve(toResponse(modules, res, method));
            } catch (err) {
                res.destroy();
                reject(err);
            }
        });

        const onAbort = () => request.destroy(toAbortError(signal));
        signal?.addEventListener("abort", onAbort, { once: true });
        // Kept for the whole request, not just until the headers land: an abort during a
        // streamed response body must tear the connection down too.
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

/**
 * Turns the `fetch` body shapes the client uses into bytes: strings and binary go
 * straight through, everything else (FormData with attachment blobs, Blob,
 * URLSearchParams, a web stream) is encoded by the platform `Response`, which also
 * yields the `content-type` - including the multipart boundary the batch command relies
 * on fetch to generate.
 *
 * A `node:stream` Readable (an attachment payload) is piped instead, so uploading a large
 * file does not have to fit in memory first.
 */
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

    // node:http would otherwise fall back to chunked transfer encoding; fetch always
    // sends a length, and RavenDB's 0-length POSTs need the explicit zero. A streamed body
    // has no length to send - that one stays chunked, exactly as undici sends it on Node.
    if (payload) {
        headers.set("content-length", String(payload.length));
    } else if (!stream && method !== "GET" && method !== "HEAD") {
        headers.set("content-length", "0");
    }

    const outgoing: Record<string, string> = {};
    headers.forEach((value, name) => outgoing[name] = value);

    return { payload, stream, headers: outgoing };
}

// Duck-typed on purpose: this module holds no runtime dependency on node:stream, and an
// attachment Readable can come from a different copy of it (CommonJS vs ESM build).
function isNodeReadable(body: unknown): body is Readable {
    const candidate = body as Readable;
    return !!candidate && typeof candidate.pipe === "function" && typeof candidate.on === "function";
}

function toResponse(modules: NodeHttpModules, res: IncomingMessage, method: string): Response {
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

    const decompressor = createDecompressor(modules.zlib, res.headers["content-encoding"]);
    let stream: Readable = res;

    if (decompressor) {
        // Mirror fetch: the caller sees the decoded body, so the encoding headers that
        // described the wire bytes must not survive.
        headers.delete("content-encoding");
        headers.delete("content-length");
        stream = res.pipe(decompressor);
    }

    if (method === "HEAD" || NULL_BODY_STATUSES.has(status)) {
        res.resume(); // release the socket back to the keep-alive pool
        return new Response(null, { status, statusText: res.statusMessage, headers });
    }

    return new Response(toWebStream(stream), { status, statusText: res.statusMessage, headers });
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
            // Node >= 22.15 / Bun >= 1.2; an older runtime simply gets the raw bytes,
            // which is what it would have got before this transport existed.
            return typeof zlib.createZstdDecompress === "function" ? zlib.createZstdDecompress() : null;
        default:
            return null;
    }
}

function toWebStream(stream: Readable): ReadableStream<Uint8Array> {
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
                    controller.error(err);
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

    // RequestExecutor branches on error.name === "AbortError" (its request timeout path).
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    return error;
}
