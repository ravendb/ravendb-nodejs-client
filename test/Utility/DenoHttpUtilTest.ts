import { createDenoHttpClient, validateDenoCertificateSupport } from "../../src/Utility/DenoHttpUtil.js";
import { Certificate } from "../../src/Auth/Certificate.js";
import assert from "node:assert";

const PEM_BUNDLE = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----\n"
    + "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----\n";

describe("DenoHttpUtil", function () {

    afterEach(() => {
        delete (globalThis as { Deno?: unknown }).Deno;
    });

    describe("createDenoHttpClient", function () {

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

    describe("validateDenoCertificateSupport", function () {

        it("accepts a PEM certificate without building a client", function () {
            let created = 0;
            (globalThis as any).Deno = {
                version: { deno: "2.9.5" },
                createHttpClient: () => {
                    created++;
                    return { close: () => { /* noop */ } };
                }
            };

            validateDenoCertificateSupport(Certificate.createPem(PEM_BUNDLE));

            assert.strictEqual(created, 0);
        });

        it("throws when Deno.createHttpClient is unavailable", function () {
            (globalThis as any).Deno = { version: { deno: "1.0.0" } };

            assert.throws(() => validateDenoCertificateSupport(Certificate.createPem(PEM_BUNDLE)),
                /Deno\.createHttpClient/);
        });

        it("throws for a PFX certificate", function () {
            (globalThis as any).Deno = { version: { deno: "2.9.5" }, createHttpClient: () => ({ close: () => { /* noop */ } }) };

            assert.throws(() => validateDenoCertificateSupport(Certificate.createPfx(Buffer.from("pfx-bytes"))),
                /PFX/);
        });

        it("throws for a passphrase-protected key", function () {
            (globalThis as any).Deno = { version: { deno: "2.9.5" }, createHttpClient: () => ({ close: () => { /* noop */ } }) };

            assert.throws(() => validateDenoCertificateSupport(Certificate.createPem(PEM_BUNDLE, "secret")),
                /passphrase/i);
        });
    });
});
