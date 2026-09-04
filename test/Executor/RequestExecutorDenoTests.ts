import { RequestExecutor } from "../../src/Http/RequestExecutor.js";
import { DocumentConventions } from "../../src/Documents/Conventions/DocumentConventions.js";
import { GetNextOperationIdCommand } from "../../src/Documents/Commands/GetNextOperationIdCommand.js";
import { IAuthOptions } from "../../src/Auth/AuthOptions.js";
import { HttpRequestParameters } from "../../src/Primitives/Http.js";
import { TypeUtil } from "../../src/Utility/TypeUtil.js";
import assert from "node:assert";

const PEM_BUNDLE = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----\n"
    + "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----\n";
const PEM_AUTH: IAuthOptions = { type: "pem", certificate: PEM_BUNDLE };
const PFX_AUTH: IAuthOptions = { type: "pfx", certificate: Buffer.from("pfx-bytes") };

// Fake of the Deno global: counts Deno.HttpClient creations and closes.
class FakeDeno {
    public created = 0;
    public closed = 0;
    public seenOptions: any = null;

    public install(withCreateHttpClient = true): void {
        const deno: any = { version: { deno: "2.9.5" } };
        if (withCreateHttpClient) {
            deno.createHttpClient = (options: any) => {
                this.created++;
                this.seenOptions = options;
                return { close: () => { this.closed++; } };
            };
        }
        (globalThis as any).Deno = deno;
    }
}

function createExecutor(authOptions?: IAuthOptions, conventions = new DocumentConventions()): RequestExecutor {
    return RequestExecutor.createForSingleNodeWithoutConfigurationUpdates(
        "https://localhost:8080", "db", { authOptions, documentConventions: conventions });
}

function createRequest(executor: RequestExecutor): HttpRequestParameters {
    const node = executor.getTopologyNodes()[0];
    return (executor as any)._createRequest(node, new GetNextOperationIdCommand(), TypeUtil.NOOP);
}

describe("RequestExecutor on Deno", function () {

    let deno: FakeDeno;

    beforeEach(() => {
        deno = new FakeDeno();
    });

    afterEach(() => {
        delete (globalThis as { Deno?: unknown }).Deno;
    });

    describe("client certificate", function () {

        it("presents the certificate through one Deno.HttpClient per executor, closed on dispose", function () {
            deno.install();
            // the factory already issues its topology request, so the client exists here
            const executor = createExecutor(PEM_AUTH);

            const first = createRequest(executor);
            const second = createRequest(executor);

            assert.ok(first.client, "request carries the Deno.HttpClient");
            assert.strictEqual(second.client, first.client, "one client per executor");
            assert.strictEqual(deno.created, 1, "built once, on the request path");
            assert.match(deno.seenOptions.cert, /BEGIN CERTIFICATE/);
            assert.match(deno.seenOptions.key, /BEGIN RSA PRIVATE KEY/);

            executor.dispose();
            assert.strictEqual(deno.closed, 1, "dispose() closes the Deno.HttpClient");
        });

        it("keeps the same Deno.HttpClient when customHttpRequestOptions are re-applied", function () {
            deno.install();
            const executor = createExecutor(PEM_AUTH);

            try {
                const before = createRequest(executor).client;
                executor.customHttpRequestOptions = { keepalive: true };
                const after = createRequest(executor);

                assert.strictEqual(after.client, before);
                assert.strictEqual(after.keepalive, true);
                assert.strictEqual(deno.created, 1);
            } finally {
                executor.dispose();
            }
        });

        it("builds no Deno.HttpClient when conventions.customFetch owns the transport", function () {
            deno.install(false); // as on platforms that strip Deno.createHttpClient
            const conventions = new DocumentConventions();
            const customFetch = () => Promise.reject(new Error("not called"));
            conventions.customFetch = customFetch;

            // must not throw: the custom fetch performs mTLS, the certificate is not our job
            const executor = createExecutor(PEM_AUTH, conventions);

            try {
                const request = createRequest(executor);

                assert.strictEqual(request.client, undefined);
                assert.strictEqual(request.fetcher, customFetch);
                assert.strictEqual(deno.created, 0);
            } finally {
                executor.dispose();
            }
        });

        it("builds no Deno.HttpClient without a certificate", function () {
            deno.install();
            const executor = createExecutor();

            try {
                assert.strictEqual(createRequest(executor).client, undefined);
                assert.strictEqual(deno.created, 0);
            } finally {
                executor.dispose();
            }
        });

        it("reports an unsupported certificate on the request path, not from the constructor", function () {
            deno.install();
            const executor = createExecutor(PFX_AUTH);

            try {
                assert.throws(() => createRequest(executor), /PFX/);
            } finally {
                executor.dispose();
            }
        });
    });

    describe("validateCertificateRuntimeSupport", function () {

        it("accepts a PEM certificate", function () {
            deno.install();
            RequestExecutor.validateCertificateRuntimeSupport(PEM_AUTH, new DocumentConventions());
            assert.strictEqual(deno.created, 0, "validation must not build a client");
        });

        it("throws for a PFX certificate", function () {
            deno.install();
            assert.throws(
                () => RequestExecutor.validateCertificateRuntimeSupport(PFX_AUTH, new DocumentConventions()),
                /PFX/);
        });

        it("throws for a passphrase-protected key", function () {
            deno.install();
            assert.throws(
                () => RequestExecutor.validateCertificateRuntimeSupport(
                    { ...PEM_AUTH, password: "secret" }, new DocumentConventions()),
                /passphrase/i);
        });

        it("throws when Deno.createHttpClient is unavailable", function () {
            deno.install(false);
            assert.throws(
                () => RequestExecutor.validateCertificateRuntimeSupport(PEM_AUTH, new DocumentConventions()),
                /Deno\.createHttpClient/);
        });

        it("skips the check when conventions.customFetch owns the transport", function () {
            deno.install(false);
            const conventions = new DocumentConventions();
            conventions.customFetch = () => Promise.reject(new Error("not called"));

            RequestExecutor.validateCertificateRuntimeSupport(PFX_AUTH, conventions);
        });

        it("does not apply off Deno", function () {
            RequestExecutor.validateCertificateRuntimeSupport(PFX_AUTH, new DocumentConventions());
        });
    });
});
