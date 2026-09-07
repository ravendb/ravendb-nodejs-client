// Minimal Cloudflare Workers smoke test for the RavenDB client (RDBC-1083).
//
// `/` - load check. Importing the package pulls in its entire module graph, so
// if any `class ... extends ...` were to resolve to `[object Module]` (the
// reported bundler-interop failure) it would throw here, at module evaluation
// time. A 200 response means the package loaded and a DocumentStore was
// constructed inside workerd.
//
// `/initialize-mtls` - configuration-time mTLS check. workerd cannot present an
// X.509 client certificate from user-space, so a store configured with
// authOptions and no conventions.customFetch must throw an actionable error
// already at initialize(), not on the first request.
import { DocumentStore } from "ravendb";

const DUMMY_PEM =
    "-----BEGIN CERTIFICATE-----\nMIIdummy\n-----END CERTIFICATE-----\n"
    + "-----BEGIN RSA PRIVATE KEY-----\nMIIdummy\n-----END RSA PRIVATE KEY-----\n";

function loadCheck(): Response {
    const store = new DocumentStore(["https://a.example"], "Test");
    store.dispose();
    return new Response("ok: ravendb loaded in workerd (" + typeof DocumentStore + ")");
}

function initializeMtlsCheck(): Response {
    const store = new DocumentStore(["https://a.example"], "Test", {
        type: "pem",
        certificate: DUMMY_PEM
    });

    try {
        store.initialize();
    } catch (err) {
        const message = (err as Error).message || "";
        if (message.includes("mtls_certificate") && message.includes("customFetch")) {
            return new Response("ok: initialize() threw the workerd mTLS error");
        }
        return new Response("FAILED: initialize() threw an unexpected error: " + message, { status: 500 });
    } finally {
        store.dispose();
    }

    return new Response(
        "FAILED: initialize() accepted a client certificate workerd cannot present",
        { status: 500 });
}

export default {
    async fetch(request: Request): Promise<Response> {
        try {
            const { pathname } = new URL(request.url);
            return pathname === "/initialize-mtls"
                ? initializeMtlsCheck()
                : loadCheck();
        } catch (err) {
            return new Response(
                "FAILED: " + ((err && (err as Error).stack) || String(err)),
                { status: 500 }
            );
        }
    }
};
