import { DocumentStore } from "ravendb";

// Load-only check (no server needed): constructs a DocumentStore so the whole
// client module graph is evaluated inside workerd via the Nitro/Rollup bundle.
export default defineEventHandler(() => {
    const store = new DocumentStore(["https://a.example"], "Test");
    store.dispose();
    return { ok: true, loaded: typeof DocumentStore };
});
