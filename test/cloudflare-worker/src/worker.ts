// Minimal Cloudflare Workers smoke test for the RavenDB client (RDBC-1083).
//
// Importing the package pulls in its entire module graph, so if any
// `class ... extends ...` were to resolve to `[object Module]` (the reported
// bundler-interop failure) it would throw here, at module evaluation time.
// A 200 response means the package loaded and a DocumentStore was constructed
// inside workerd.
import { DocumentStore } from "ravendb";

export default {
    async fetch(): Promise<Response> {
        try {
            const store = new DocumentStore(["https://a.example"], "Test");
            store.dispose();
            return new Response("ok: ravendb loaded in workerd (" + typeof DocumentStore + ")");
        } catch (err) {
            return new Response(
                "FAILED: " + ((err && (err as Error).stack) || String(err)),
                { status: 500 }
            );
        }
    }
};
