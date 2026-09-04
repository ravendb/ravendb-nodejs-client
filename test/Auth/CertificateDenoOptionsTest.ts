import { Certificate } from "../../src/Auth/Certificate.js";
import assert from "node:assert";

const PEM_CERT = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----";
const PEM_KEY = "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----";
const PEM_BUNDLE = PEM_CERT + "\n" + PEM_KEY + "\n";
const PEM_CA = "-----BEGIN CERTIFICATE-----\nMIIca\n-----END CERTIFICATE-----";

describe("Certificate.toDenoHttpClientOptions", function () {

    it("maps a PEM certificate to Deno.createHttpClient options", function () {
        const certificate = Certificate.createPem(PEM_BUNDLE);
        const options = certificate.toDenoHttpClientOptions();

        assert.strictEqual(options.cert, PEM_CERT);
        assert.strictEqual(options.key, PEM_KEY);
        assert.strictEqual(options.caCerts, undefined);
    });

    it("passes the CA bundle through caCerts", function () {
        const certificate = Certificate.createPem(PEM_BUNDLE, undefined, PEM_CA);
        const options = certificate.toDenoHttpClientOptions();

        assert.deepStrictEqual(options.caCerts, [PEM_CA]);
    });

    it("converts a Buffer CA to a string", function () {
        const certificate = Certificate.createPem(PEM_BUNDLE, undefined, Buffer.from(PEM_CA));
        const options = certificate.toDenoHttpClientOptions();

        assert.deepStrictEqual(options.caCerts, [PEM_CA]);
    });

    it("throws an actionable error for an encrypted (passphrase) key", function () {
        const certificate = Certificate.createPem(PEM_BUNDLE, "secret");

        assert.throws(() => certificate.toDenoHttpClientOptions(), (err: Error) => {
            assert.match(err.message, /passphrase/i);
            assert.match(err.message, /decrypt/i);
            return true;
        });
    });

    it("throws an actionable error when the PEM has no private key block", function () {
        const certificate = Certificate.createPem(PEM_CERT);

        assert.throws(() => certificate.toDenoHttpClientOptions(), (err: Error) => {
            assert.match(err.message, /private key/i);
            assert.match(err.message, /BEGIN PRIVATE KEY/);
            return true;
        });
    });

    it("throws an actionable error for a PFX certificate", function () {
        const certificate = Certificate.createPfx(Buffer.from("pfx-bytes"));

        assert.throws(() => certificate.toDenoHttpClientOptions(), (err: Error) => {
            assert.match(err.message, /PFX/);
            assert.match(err.message, /PEM/);
            return true;
        });
    });
});
