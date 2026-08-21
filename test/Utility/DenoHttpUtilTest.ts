import { createDenoHttpClient } from "../../src/Utility/DenoHttpUtil.js";
import { Certificate } from "../../src/Auth/Certificate.js";
import assert from "node:assert";

const PEM_BUNDLE = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----\n"
    + "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----\n";

describe("createDenoHttpClient", function () {

    afterEach(() => {
        delete (globalThis as { Deno?: unknown }).Deno;
    });

    it("builds a Deno HttpClient from the certificate options", function () {
        const sentinel = { close: () => { /* Deno.HttpClient shape */ } };
        let seenOptions: any;
        (globalThis as any).Deno = {
            version: { deno: "2.9.5" },
            createHttpClient: (options: any) => {
                seenOptions = options;
                return sentinel;
            }
        };

        const client = createDenoHttpClient(Certificate.createPem(PEM_BUNDLE));

        assert.strictEqual(client, sentinel);
        assert.match(seenOptions.cert, /BEGIN CERTIFICATE/);
        assert.match(seenOptions.key, /BEGIN RSA PRIVATE KEY/);
    });

    it("throws an actionable error when Deno.createHttpClient is unavailable", function () {
        (globalThis as any).Deno = { version: { deno: "1.0.0" } };

        assert.throws(() => createDenoHttpClient(Certificate.createPem(PEM_BUNDLE)), (err: Error) => {
            assert.match(err.message, /Deno\.createHttpClient/);
            assert.match(err.message, /client certificate/i);
            assert.match(err.message, /customFetch/);
            return true;
        });
    });
});
