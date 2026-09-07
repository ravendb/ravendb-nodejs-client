import { Certificate } from "../../src/Auth/Certificate.js";
import { Agent } from "undici-types";
import { createPrivateKey, generateKeyPairSync } from "node:crypto";
import assert from "node:assert";

const PEM_CERT = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----";
const PKCS1_KEY = "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----";
const PKCS8_KEY = "-----BEGIN PRIVATE KEY-----\nMIIkey\n-----END PRIVATE KEY-----";
const SEC1_KEY = "-----BEGIN EC PRIVATE KEY-----\nMIIkey\n-----END EC PRIVATE KEY-----";
const ENCRYPTED_PKCS8_KEY = "-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIkey\n-----END ENCRYPTED PRIVATE KEY-----";

function connectKey(certificate: ReturnType<typeof Certificate.createPem>): string {
    return (certificate.toAgentOptions().connect as Agent.Options["connect"] & { key: string }).key;
}

describe("PemCertificate private key parsing", function () {

    it("extracts a PKCS#1 key (BEGIN RSA PRIVATE KEY)", function () {
        const certificate = Certificate.createPem(PEM_CERT + "\n" + PKCS1_KEY + "\n");

        assert.strictEqual(connectKey(certificate), PKCS1_KEY);
        assert.strictEqual(certificate.toDenoHttpClientOptions().key, PKCS1_KEY);
    });

    it("extracts a PKCS#8 key (BEGIN PRIVATE KEY), the OpenSSL 3 default", function () {
        const certificate = Certificate.createPem(PEM_CERT + "\n" + PKCS8_KEY + "\n");

        assert.strictEqual(connectKey(certificate), PKCS8_KEY);
        assert.strictEqual(certificate.toSocketOptions().key, PKCS8_KEY);
        assert.strictEqual(certificate.toBunTlsOptions().key, PKCS8_KEY);
        assert.strictEqual(certificate.toDenoHttpClientOptions().key, PKCS8_KEY);
    });

    it("extracts a SEC1 key (BEGIN EC PRIVATE KEY)", function () {
        const certificate = Certificate.createPem(SEC1_KEY + "\n" + PEM_CERT + "\n");

        assert.strictEqual(connectKey(certificate), SEC1_KEY);
        assert.strictEqual(certificate.toDenoHttpClientOptions().key, SEC1_KEY);
    });

    it("extracts an encrypted PKCS#8 key (BEGIN ENCRYPTED PRIVATE KEY)", function () {
        const certificate = Certificate.createPem(PEM_CERT + "\n" + ENCRYPTED_PKCS8_KEY + "\n", "secret");

        assert.strictEqual(connectKey(certificate), ENCRYPTED_PKCS8_KEY);
    });

    it("extracts a key Node can load from a real PKCS#8 bundle", function () {
        const { privateKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
            publicKeyEncoding: { type: "spki", format: "pem" }
        });
        assert.match(privateKey, /^-----BEGIN PRIVATE KEY-----/);

        const certificate = Certificate.createPem(PEM_CERT + "\n" + privateKey);

        assert.strictEqual(createPrivateKey(connectKey(certificate)).asymmetricKeyType, "rsa");
    });

    it("extracts a key Node can load from a real SEC1 bundle", function () {
        const { privateKey } = generateKeyPairSync("ec", {
            namedCurve: "P-256",
            privateKeyEncoding: { type: "sec1", format: "pem" },
            publicKeyEncoding: { type: "spki", format: "pem" }
        });
        assert.match(privateKey, /^-----BEGIN EC PRIVATE KEY-----/);

        const certificate = Certificate.createPem(PEM_CERT + "\n" + privateKey);

        assert.strictEqual(createPrivateKey(connectKey(certificate)).asymmetricKeyType, "ec");
    });

    it("leaves the key null when the PEM has no private key block", function () {
        const certificate = Certificate.createPem(PEM_CERT);

        assert.strictEqual(connectKey(certificate), null);
    });
});
