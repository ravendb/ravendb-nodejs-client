import assert from "node:assert";
import { Readable } from "node:stream";
import {
    CreateClientCertificateOperation,
    PutClientCertificateOperation,
    EditClientCertificateOperation,
    CreateDatabaseOperation,
    DeleteDatabasesOperation,
    DeleteCertificateOperation,
    GetCertificateOperation,
    GetCertificateMetadataOperation,
    GetCertificatesOperation,
    GetCertificatesMetadataOperation,
    GetDatabaseNamesOperation,
    DatabaseAccess,
    DocumentConventions,
    IDocumentStore
} from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";

// RDBC-1085: the client's command-payload serializer PascalCases the first letter of every object
// key, including the keys of the `permissions` map (which are database names). A lowercase database
// name like "lowercase_db" was being sent as "Lowercase_db", and because the server matches permission
// keys case-sensitively, certificate permissions no longer lined up with the database name.
// The permission keys must travel to the server verbatim.
describe("[RDBC-1085]", () => {

    const conventions = new DocumentConventions();
    const node = { url: "http://localhost:8080", database: "test" } as any;

    // "My.Db" also guards the write path against mangling database names that contain '.'.
    const permissions = {
        "lowercase_db": "Admin",
        "mixedCaseDb": "ReadWrite",
        "UPPER_db": "Read",
        "My.Db": "Admin"
    } as Record<string, DatabaseAccess>;
    const expectedWrittenKeys = ["lowercase_db", "mixedCaseDb", "UPPER_db", "My.Db"];

    function permissionKeysOf(body: string): string[] {
        return Object.keys(JSON.parse(body).Permissions ?? {});
    }

    it("CreateClientCertificateOperation keeps permission (database-name) keys verbatim", () => {
        const command = new CreateClientCertificateOperation("cert", permissions, "ValidUser")
            .getCommand(conventions);
        const body = command.createRequest(node).body as string;

        assert.deepStrictEqual(permissionKeysOf(body), expectedWrittenKeys);
    });

    it("PutClientCertificateOperation keeps permission (database-name) keys verbatim", () => {
        const command = new PutClientCertificateOperation("cert", "public-key", permissions, "ValidUser")
            .getCommand(conventions);
        const body = command.createRequest(node).body as string;

        assert.deepStrictEqual(permissionKeysOf(body), expectedWrittenKeys);
    });

    it("EditClientCertificateOperation keeps permission (database-name) keys verbatim", () => {
        const command = new EditClientCertificateOperation({
            thumbprint: "ABC123",
            name: "cert",
            clearance: "ValidUser",
            permissions
        }).getCommand(conventions);
        const body = command.createRequest(node).body as string;

        assert.deepStrictEqual(permissionKeysOf(body), expectedWrittenKeys);
    });

    it("top-level certificate fields are still PascalCased on the wire", () => {
        const command = new CreateClientCertificateOperation("cert", permissions, "ValidUser")
            .getCommand(conventions);
        const parsed = JSON.parse(command.createRequest(node).body as string);

        assert.ok("Name" in parsed, "expected PascalCased 'Name' field");
        assert.ok("SecurityClearance" in parsed, "expected PascalCased 'SecurityClearance' field");
        assert.ok("Permissions" in parsed, "expected PascalCased 'Permissions' field");
    });

    // A "My.Db" key also guards the ignore-path regex: database names may contain '.'.
    const serverPermissions = {
        "lowercase_db": "Admin",
        "mixedCaseDb": "ReadWrite",
        "UPPER_db": "Read",
        "My.Db": "Admin"
    };
    const expectedPermissionKeys = ["lowercase_db", "mixedCaseDb", "UPPER_db", "My.Db"];

    function singleCertResponse(): string {
        return JSON.stringify({
            Results: [{
                Name: "cert",
                SecurityClearance: "ValidUser",
                Thumbprint: "ABC123",
                NotAfter: "2099-01-01T00:00:00.0000000Z",
                NotBefore: "2020-01-01T00:00:00.0000000Z",
                Permissions: serverPermissions
            }]
        });
    }

    it("GetCertificatesMetadataOperation reads permission (database-name) keys verbatim", async () => {
        const command = new GetCertificatesMetadataOperation("cert").getCommand(conventions);
        await command.setResponseAsync(Readable.from([singleCertResponse()]), false);

        assert.deepStrictEqual(Object.keys(command.result[0].permissions ?? {}), expectedPermissionKeys);
    });

    it("GetCertificateMetadataOperation reads permission (database-name) keys verbatim", async () => {
        const command = new GetCertificateMetadataOperation("ABC123").getCommand(conventions);
        await command.setResponseAsync(Readable.from([singleCertResponse()]), false);

        assert.deepStrictEqual(Object.keys(command.result.permissions ?? {}), expectedPermissionKeys);
    });

    it("GetCertificateOperation reads permission (database-name) keys verbatim", async () => {
        const command = new GetCertificateOperation("ABC123").getCommand(conventions);
        await command.setResponseAsync(Readable.from([singleCertResponse()]), false);

        assert.deepStrictEqual(Object.keys(command.result.permissions ?? {}), expectedPermissionKeys);
    });

    it("GetCertificatesOperation reads permission (database-name) keys verbatim", async () => {
        const command = new GetCertificatesOperation(0, 20).getCommand(conventions);
        await command.setResponseAsync(Readable.from([singleCertResponse()]), false);

        assert.deepStrictEqual(Object.keys(command.result[0].permissions ?? {}), expectedPermissionKeys);
    });
});

// Full end-to-end reproduction of the ticket flow against a secured server. Certificate operations
// require HTTPS + a client certificate, so this uses a secured document store.
describe("[RDBC-1085] full flow", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getSecuredDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("preserves database-name casing across delete/recreate and keeps certificate permissions aligned", async function () {
        this.timeout(60_000);

        // A mixed-case name exercises both the write path (permission key sent verbatim) and the
        // read path (permission key read back verbatim). A lowercase-first name would mask the read
        // path, since camelCasing a name that already starts lowercase is a no-op.
        const requestedName = "MyDb";
        const certName = "RDBC-1085-full-flow-cert";

        let thumbprint: string;

        try {
            // Register a client certificate whose permissions are keyed to the requested database name.
            await store.maintenance.server.send(new CreateClientCertificateOperation(
                certName,
                { [requestedName]: "Admin" } as Record<string, DatabaseAccess>,
                "ValidUser"));

            // Create the database with the requested name.
            await store.maintenance.server.send(
                new CreateDatabaseOperation({ databaseName: requestedName }));

            // 1. Capture the target database's certificate permissions.
            const metadataBefore = await store.maintenance.server.send(
                new GetCertificatesMetadataOperation(certName));
            assert.strictEqual(metadataBefore.length, 1);
            thumbprint = metadataBefore[0].thumbprint;
            const capturedPermissions = metadataBefore[0].permissions ?? {};

            // The captured permission key must match the requested database name.
            assert.deepStrictEqual(Object.keys(capturedPermissions), [requestedName]);

            // 2. Hard-delete the target database.
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [requestedName],
                hardDelete: true
            }));

            // 3. Recreate it using the same name.
            await store.maintenance.server.send(
                new CreateDatabaseOperation({ databaseName: requestedName }));

            // 4. Restore the captured certificate permissions.
            await store.maintenance.server.send(new EditClientCertificateOperation({
                thumbprint,
                name: metadataBefore[0].name,
                permissions: capturedPermissions,
                clearance: metadataBefore[0].securityClearance
            }));

            // The recreated database must keep the exact casing we requested.
            const databaseNames = await store.maintenance.server.send(
                new GetDatabaseNamesOperation(0, 100));
            assert.ok(databaseNames.includes(requestedName),
                `expected database '${requestedName}' but got ${JSON.stringify(databaseNames)}`);

            // The restored permission key must still line up (case-sensitively) with the database name.
            const metadataAfter = await store.maintenance.server.send(
                new GetCertificatesMetadataOperation(certName));
            assert.strictEqual(metadataAfter.length, 1);
            assert.deepStrictEqual(Object.keys(metadataAfter[0].permissions ?? {}), [requestedName]);
        } finally {
            // Clean up the recreated database and the test certificate.
            try {
                await store.maintenance.server.send(new DeleteDatabasesOperation({
                    databaseNames: [requestedName],
                    hardDelete: true
                }));
            } catch {
                // ignore
            }
            if (thumbprint) {
                try {
                    await store.maintenance.server.send(new DeleteCertificateOperation(thumbprint));
                } catch {
                    // ignore
                }
            }
        }
    });
});
