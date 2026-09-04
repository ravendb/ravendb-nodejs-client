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

    console.log(`SMOKE OK: stored and loaded ${id}`);
} finally {
    store.dispose();
}
