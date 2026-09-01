import assert from "node:assert";
import { Readable } from "node:stream";
import {
    GetCertificateMetadataOperation,
    GetCertificatesMetadataOperation,
    DocumentConventions
} from "../../../../src/index.js";

describe("CertificateSsoTest", () => {

    const conventions = new DocumentConventions();

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
