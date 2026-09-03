import assert from "node:assert";
import { Readable } from "node:stream";
import {
    CreateClientCertificateOperation,
    DeleteCertificateOperation,
    EditClientCertificateOperation,
    GetCertificateMetadataOperation,
    GetCertificatesMetadataOperation,
    DatabaseAccess,
    DocumentConventions,
    EditClientCertificateParameters,
    IDocumentStore
} from "../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil.js";

describe("CertificateSsoTest", () => {

    const conventions = new DocumentConventions();
    const node = { url: "http://localhost:8080", database: "test" } as any;

    function editBody(parameters: EditClientCertificateParameters): Record<string, any> {
        const request = new EditClientCertificateOperation(parameters)
            .getCommand(conventions)
            .createRequest(node);
        return JSON.parse(request.body as string);
    }

    it("edit body always carries Disabled, never Usage, and no SSO key unless provided", () => {
        const plain = editBody({
            thumbprint: "T1",
            name: "cert",
            clearance: "ValidUser",
            permissions: { "MyDb": "Admin" }
        });

        assert.strictEqual(plain.Disabled, false);
        assert.strictEqual(plain.Thumbprint, "T1");
        assert.strictEqual(plain.Name, "cert");
        assert.strictEqual(plain.SecurityClearance, "ValidUser");
        assert.deepStrictEqual(plain.Permissions, { "MyDb": "Admin" });
        assert.deepStrictEqual(Object.keys(plain).filter(k => k.startsWith("Sso")), []);
        assert.ok(!("Usage" in plain), "the server derives Usage; the client must not write it");

        const disabled = editBody({
            thumbprint: "T1",
            name: "cert",
            clearance: "ValidUser",
            permissions: { "MyDb": "Admin" },
            disabled: true
        });

        assert.strictEqual(disabled.Disabled, true);
    });

    it("edit body writes the provided SSO fields and omits Domain when empty or null", () => {
        const body = editBody({
            thumbprint: "T1",
            name: "cert",
            clearance: "ValidUser",
            permissions: { "My.Db": "Admin", "lowercase_db": "ReadWrite", "UPPER_db": "Read" },
            ssoServerPublicKeyPinningHashes: ["h1", "h2"],
            allowAnySsoServer: true,
            ssoIdentifiers: [
                { provider: "Github", identifier: "alice", domain: "example.com" },
                { provider: "Microsoft", identifier: "bob" },
                { provider: "Google", identifier: "carol", domain: "" },
                { provider: "Windows", identifier: "dave", domain: null }
            ]
        });

        assert.deepStrictEqual(body.SsoServerPublicKeyPinningHashes, ["h1", "h2"]);
        assert.strictEqual(body.AllowAnySsoServer, true);
        assert.deepStrictEqual(body.SsoIdentifiers, [
            { Provider: "Github", Identifier: "alice", Domain: "example.com" },
            { Provider: "Microsoft", Identifier: "bob" },
            { Provider: "Google", Identifier: "carol" },
            { Provider: "Windows", Identifier: "dave" }
        ]);
        // Permission keys are database names and travel verbatim (RDBC-1085).
        assert.deepStrictEqual(Object.keys(body.Permissions), ["My.Db", "lowercase_db", "UPPER_db"]);
        assert.ok(!("Usage" in body));
    });

    it("edit body writes an explicitly-empty SSO list, and omits a null one", () => {
        const cleared = editBody({
            thumbprint: "T1",
            name: "cert",
            clearance: "ValidUser",
            permissions: { "MyDb": "Admin" },
            ssoServerPublicKeyPinningHashes: [],
            allowAnySsoServer: false,
            ssoIdentifiers: []
        });

        // An empty list is the way a caller clears the stored SSO configuration.
        assert.deepStrictEqual(cleared.SsoServerPublicKeyPinningHashes, []);
        assert.strictEqual(cleared.AllowAnySsoServer, false);
        assert.deepStrictEqual(cleared.SsoIdentifiers, []);

        const nulled = editBody({
            thumbprint: "T1",
            name: "cert",
            clearance: "ValidUser",
            permissions: { "MyDb": "Admin" },
            ssoServerPublicKeyPinningHashes: null,
            allowAnySsoServer: null,
            ssoIdentifiers: null
        });

        assert.deepStrictEqual(Object.keys(nulled).filter(k => k.startsWith("Sso")), []);
        assert.ok(!("AllowAnySsoServer" in nulled));
    });

    function certificatesResponse(certificate: Record<string, any>): string {
        return JSON.stringify({
            Results: [{
                Name: "cert",
                SecurityClearance: "ValidUser",
                Thumbprint: "T1",
                NotAfter: "2099-01-01T00:00:00.0000000Z",
                NotBefore: "2020-01-01T00:00:00.0000000Z",
                Permissions: { "MyDb": "ReadWrite" },
                ...certificate
            }]
        });
    }

    // The two metadata operations revive with different pipelines (a manual map plus DateUtil, and
    // objectMapper.fromObjectLiteral), so every body is read back through both.
    async function reviveBoth(body: string): Promise<Record<string, any>[]> {
        const single = new GetCertificateMetadataOperation("T1").getCommand(conventions);
        await single.setResponseAsync(Readable.from([body]), false);

        const plural = new GetCertificatesMetadataOperation("cert").getCommand(conventions);
        await plural.setResponseAsync(Readable.from([body]), false);

        return [single.result, plural.result[0]];
    }

    it("read-back revives the populated SSO members", async () => {
        const results = await reviveBoth(certificatesResponse({
            Usage: "SsoClient",
            SsoServerPublicKeyPinningHashes: ["h1", "h2"],
            AllowAnySsoServer: true,
            SsoIdentifiers: [{ Provider: "Github", Identifier: "alice", Domain: "example.com" }]
        }));

        for (const result of results) {
            assert.strictEqual(result.usage, "SsoClient");
            assert.deepStrictEqual(result.ssoServerPublicKeyPinningHashes, ["h1", "h2"]);
            assert.strictEqual(result.allowAnySsoServer, true);
            assert.deepStrictEqual(result.ssoIdentifiers,
                [{ provider: "Github", identifier: "alice", domain: "example.com" }]);
        }
    });

    it("read-back revives the SSO defaults and an identifier without a domain", async () => {
        const results = await reviveBoth(certificatesResponse({
            Usage: null,
            SsoServerPublicKeyPinningHashes: [],
            AllowAnySsoServer: false,
            SsoIdentifiers: [
                { Provider: "Google", Identifier: "eve" },
                { Provider: "Windows", Identifier: "frank", Domain: null }
            ]
        }));

        for (const result of results) {
            assert.strictEqual(result.usage, null);
            assert.deepStrictEqual(result.ssoServerPublicKeyPinningHashes, []);
            assert.strictEqual(result.allowAnySsoServer, false);
            assert.deepStrictEqual(result.ssoIdentifiers[0], { provider: "Google", identifier: "eve" });
            assert.strictEqual(result.ssoIdentifiers[1].domain, null);
        }
    });

    it("read-back revives the SSO members as undefined when the server sends none", async () => {
        // A 7.2.3 server carries none of the four keys.
        const results = await reviveBoth(certificatesResponse({}));

        for (const result of results) {
            for (const member of ["usage", "ssoServerPublicKeyPinningHashes", "allowAnySsoServer", "ssoIdentifiers"]) {
                assert.ok(!(member in result), `expected ${member} to be undefined`);
            }
        }
    });
});

// Certificate operations require HTTPS and a client certificate, so the live part needs a secured
// store. Creating an SSO certificate is out of reach for the client surface (no operation writes
// Usage), so this covers the read-back of the SSO members and the Disabled round trip.
(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("CertificateSsoTest secured server", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getSecuredDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("reads the SSO members back and round-trips the Disabled toggle", async function () {
        this.timeout(60_000);

        const certName = "certificate-sso-test-cert";
        let thumbprint: string;

        try {
            await store.maintenance.server.send(new CreateClientCertificateOperation(
                certName,
                { "MyDb": "Admin" } as Record<string, DatabaseAccess>,
                "ValidUser"));

            const created = await store.maintenance.server.send(
                new GetCertificatesMetadataOperation(certName));
            assert.strictEqual(created.length, 1);
            thumbprint = created[0].thumbprint;

            assert.ok("usage" in created[0], "a 7.2.5 server always serializes Usage");
            assert.deepStrictEqual(created[0].ssoServerPublicKeyPinningHashes, []);
            assert.strictEqual(created[0].allowAnySsoServer, false);
            assert.deepStrictEqual(created[0].ssoIdentifiers, []);

            const editParameters: EditClientCertificateParameters = {
                thumbprint,
                name: created[0].name,
                permissions: { "MyDb": "ReadWrite" } as Record<string, DatabaseAccess>,
                clearance: created[0].securityClearance,
                disabled: true
            };
            await store.maintenance.server.send(new EditClientCertificateOperation(editParameters));

            const disabled = await store.maintenance.server.send(
                new GetCertificateMetadataOperation(thumbprint));
            assert.strictEqual((disabled as any).disabled, true);
            assert.deepStrictEqual(disabled.permissions, { "MyDb": "ReadWrite" });

            // An edit that leaves the SSO fields out must not disturb them.
            assert.deepStrictEqual(disabled.ssoIdentifiers, []);

            await store.maintenance.server.send(new EditClientCertificateOperation({
                ...editParameters,
                disabled: false
            }));

            const enabled = await store.maintenance.server.send(
                new GetCertificateMetadataOperation(thumbprint));
            assert.strictEqual((enabled as any).disabled, false);
        } finally {
            if (thumbprint) {
                await store.maintenance.server.send(new DeleteCertificateOperation(thumbprint));
            }
        }
    });
});
