import { ICertificate } from "../Auth/Certificate.js";
import { throwError } from "../Exceptions/index.js";

/**
 * The slice of `Deno.HttpClient` this (Node-compiled) codebase relies on: an opaque
 * handle owning a connection pool, so whoever creates one must `close()` it.
 */
export interface DenoHttpClient {
    close(): void;
}

type DenoCreateHttpClient = (options: unknown) => DenoHttpClient;

function getDenoCreateHttpClient(): DenoCreateHttpClient {
    const deno = (globalThis as { Deno?: { createHttpClient?: DenoCreateHttpClient } }).Deno;

    if (typeof deno?.createHttpClient !== "function") {
        throwError("InvalidOperationException",
            "A client certificate was configured via authOptions, but Deno.createHttpClient is not "
            + "available in this runtime (older Deno versions gate it behind an --unstable flag, and some "
            + "Deno-based edge platforms remove it), so the certificate cannot be presented. "
            + "Upgrade Deno, provide a fetch that performs mTLS via conventions.customFetch, "
            + "or route the RavenDB calls through a backend that supports mTLS.");
    }

    return options => deno.createHttpClient(options);
}

/**
 * Throws when the configured X.509 client certificate cannot be presented on this Deno
 * runtime: no `Deno.createHttpClient` (gated or stripped), a PFX archive, or a
 * passphrase-protected key. Builds nothing - RequestExecutor.validateCertificateRuntimeSupport
 * runs it at DocumentStore.initialize() so misconfiguration surfaces at startup.
 */
export function validateDenoCertificateSupport(certificate: ICertificate): void {
    getDenoCreateHttpClient();
    certificate.toDenoHttpClientOptions();
}

/**
 * Builds a Deno HttpClient presenting the configured X.509 client certificate,
 * for passing as the (Deno-specific) `client` option of `fetch`. This is the
 * only way to do mTLS on Deno - its fetch has no undici dispatcher concept and
 * silently ignores one, which is exactly how certificates used to get dropped
 * (RDBC-1083). The caller owns the returned client and must `close()` it.
 */
export function createDenoHttpClient(certificate: ICertificate): DenoHttpClient {
    return getDenoCreateHttpClient()(certificate.toDenoHttpClientOptions());
}
