import { ICertificate } from "../Auth/Certificate.js";
import { throwError } from "../Exceptions/index.js";

/**
 * Builds a Deno HttpClient presenting the configured X.509 client certificate,
 * for passing as the (Deno-specific) `client` option of `fetch`. This is the
 * only way to do mTLS on Deno - its fetch has no undici dispatcher concept and
 * silently ignores one, which is exactly how certificates used to get dropped
 * (RDBC-1083).
 *
 * `Deno.HttpClient` is opaque to this (Node-compiled) codebase, hence `unknown`.
 */
export function createDenoHttpClient(certificate: ICertificate): unknown {
    const deno = (globalThis as { Deno?: { createHttpClient?: (options: unknown) => unknown } }).Deno;

    if (typeof deno?.createHttpClient !== "function") {
        throwError("InvalidOperationException",
            "A client certificate was configured via authOptions, but Deno.createHttpClient is not "
            + "available in this runtime (older Deno versions gate it behind an --unstable flag, and some "
            + "Deno-based edge platforms remove it), so the certificate cannot be presented. "
            + "Upgrade Deno, provide a fetch that performs mTLS via conventions.customFetch, "
            + "or route the RavenDB calls through a backend that supports mTLS.");
    }

    return deno.createHttpClient(certificate.toDenoHttpClientOptions());
}
