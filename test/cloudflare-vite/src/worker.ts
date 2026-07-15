// Vite + Rollup (via @cloudflare/vite-plugin) load check for the RavenDB client.
// Importing + constructing forces the whole module graph to evaluate in workerd.
import { DocumentStore } from "ravendb";

export default {
    async fetch(): Promise<Response> {
        try {
            const store = new DocumentStore(["https://a.example"], "Test");
            store.dispose();
            return Response.json({ ok: true, loaded: typeof DocumentStore });
        } catch (err) {
            return new Response("FAILED: " + ((err && (err as Error).stack) || String(err)), { status: 500 });
        }
    }
};
