import { DocumentStore, CreateDatabaseOperation } from "ravendb";

// Real end-to-end data path: store a document and load it back from a RavenDB
// server, entirely from inside workerd. Exercises the request + response-stream
// pipeline (PassThrough / Readable.fromWeb) that node:stream must provide.
export default defineEventHandler(async (event) => {
    const url = (getQuery(event).url as string) || "http://127.0.0.1:8080";
    const database = "workers-e2e";
    const store = new DocumentStore([url], database);
    store.initialize();
    try {
        try {
            await store.maintenance.server.send(new CreateDatabaseOperation({ databaseName: database }));
        } catch {
            // database already exists -- fine
        }

        const id = "items/1";
        const payload = { message: "hello from workerd", at: "e2e" };
        {
            const session = store.openSession();
            await session.store(payload, id);
            await session.saveChanges();
        }
        const session = store.openSession();
        const loaded = await session.load<typeof payload>(id);

        return { ok: loaded?.message === payload.message, loaded };
    } catch (err) {
        return { ok: false, error: `${(err as Error).name}: ${(err as Error).message}` };
    } finally {
        store.dispose();
    }
});
