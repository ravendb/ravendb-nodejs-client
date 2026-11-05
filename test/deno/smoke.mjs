// Deno end-to-end smoke test for X.509 client-certificate authentication (RDBC-1083).
//
// Runs a real store + load against a secured RavenDB server using a PEM client
// certificate configured via authOptions. Before the Deno mTLS support this
// silently sent uncertified requests (the server answered 403 with no hint that
// the configured certificate was dropped); with it, the client presents the
// certificate through Deno.createHttpClient. Exits non-zero on any failure.
//
// Environment:
//   RAVENDB_URL          server url, e.g. https://ravendb:8080
//   RAVENDB_DATABASE     database name (must exist), e.g. smoke
//   RAVENDB_CLIENT_CERT  path to a PEM file holding the client certificate + key
//   RAVENDB_CA           optional path to a PEM CA bundle for the server certificate
import { DocumentStore } from "ravendb";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";

const url = Deno.env.get("RAVENDB_URL") ?? "https://ravendb:8080";
const database = Deno.env.get("RAVENDB_DATABASE") ?? "smoke";
const certPath = Deno.env.get("RAVENDB_CLIENT_CERT") ?? "/certs/client.pem";
const caPath = Deno.env.get("RAVENDB_CA");

const authOptions = {
    type: "pem",
    certificate: readFileSync(certPath, "utf8"),
    ca: caPath ? readFileSync(caPath, "utf8") : undefined
};

const store = new DocumentStore(url, database, authOptions);
store.initialize();

try {
    const id = "deno-smoke/" + crypto.randomUUID();

    const writeSession = store.openSession();
    await writeSession.store({ name: "deno-smoke" }, id);
    await writeSession.saveChanges();

    const loaded = await store.openSession().load(id);
    if (!loaded || loaded.name !== "deno-smoke") {
        throw new Error(`load mismatch: ${JSON.stringify(loaded)}`);
    }

    // Deno's fetch transfers request body chunks, which pooled or caller-owned buffers do not survive
    const bulkId = "deno-smoke-bulk/" + crypto.randomUUID();
    const bytes = Buffer.alloc(2 * 1024 * 1024, 7);
    const bulk = store.bulkInsert();
    await bulk.store({ name: "deno-smoke-bulk" }, bulkId);
    const attachments = bulk.attachmentsFor(bulkId);
    await attachments.store("first", bytes);
    await attachments.store("second", bytes);
    await bulk.finish();

    for (const name of ["first", "second"]) {
        const attachment = await store.openSession().advanced.attachments.get(bulkId, name);
        const chunks = [];
        for await (const chunk of attachment.data) {
            chunks.push(chunk);
        }
        attachment.dispose();
        if (!Buffer.concat(chunks).equals(bytes)) {
            throw new Error(`bulk insert attachment ${name} mismatch`);
        }
    }

    console.log(`SMOKE OK: stored and loaded ${id}, bulk inserted ${bulkId} with attachments`);
} finally {
    store.dispose();
}
