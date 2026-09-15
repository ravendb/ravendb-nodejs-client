import sinon from "sinon";
import assert from "node:assert";
import { RequestExecutor } from "../../src/Http/RequestExecutor.js";
import { DocumentConventions } from "../../src/Documents/Conventions/DocumentConventions.js";
import { GetNextOperationIdCommand } from "../../src/Documents/Commands/GetNextOperationIdCommand.js";
import { IAuthOptions } from "../../src/Auth/AuthOptions.js";
import { HttpRequestParameters } from "../../src/Primitives/Http.js";
import { RuntimeUtil } from "../../src/Utility/RuntimeUtil.js";
import { TypeUtil } from "../../src/Utility/TypeUtil.js";

const PEM_BUNDLE = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----\n"
    + "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----\n";
const PEM_AUTH: IAuthOptions = { type: "pem", certificate: PEM_BUNDLE };
const PFX_AUTH: IAuthOptions = { type: "pfx", certificate: Buffer.from("pfx-bytes"), password: "secret" };

function createExecutor(authOptions?: IAuthOptions, conventions = new DocumentConventions()): RequestExecutor {
    return RequestExecutor.createForSingleNodeWithoutConfigurationUpdates(
        "https://localhost:8080", "db", { authOptions, documentConventions: conventions });
}

function createRequest(executor: RequestExecutor): HttpRequestParameters {
    const node = executor.getTopologyNodes()[0];
    return (executor as any)._createRequest(node, new GetNextOperationIdCommand(), TypeUtil.NOOP);
}

describe("RequestExecutor on Bun", function () {

    let isBun: sinon.SinonStub;
    let bunVersion: sinon.SinonStub;

    beforeEach(() => {
        isBun = sinon.stub(RuntimeUtil, "isBun").returns(true);
        bunVersion = sinon.stub(RuntimeUtil, "getBunVersion").returns("1.4.2");
    });

    afterEach(() => {
        isBun.restore();
        bunVersion.restore();
    });

    describe("PKCS#12 client certificate", function () {

        it("presents it through one node:https fetcher per executor, released on dispose", function () {
            const executor = createExecutor(PFX_AUTH);

            const first = createRequest(executor);
            const second = createRequest(executor);

            assert.strictEqual(typeof first.fetcher, "function", "request carries the node:https fetcher");
            assert.strictEqual(second.fetcher, first.fetcher, "one transport per executor");

            executor.dispose();
            assert.strictEqual(executor["_bunHttpTransport"], null, "dispose() releases the transport");
        });

        it("does not put the archive in Bun's tls option - fetch would ignore it", function () {
            const executor = createExecutor(PFX_AUTH);

            try {
                assert.strictEqual(createRequest(executor).tls, undefined);
            } finally {
                executor.dispose();
            }
        });

        it("leaves the transport to conventions.customFetch when one is configured", function () {
            const conventions = new DocumentConventions();
            const customFetch = () => Promise.resolve(new Response());
            conventions.customFetch = customFetch;

            const executor = createExecutor(PFX_AUTH, conventions);

            try {
                assert.strictEqual(createRequest(executor).fetcher, customFetch);
                assert.strictEqual(executor["_bunHttpTransport"], null, "no node:https transport is built");
            } finally {
                executor.dispose();
            }
        });
    });

    describe("PEM client certificate", function () {

        it("keeps using Bun's tls request option - its fetch honours cert/key", function () {
            const executor = createExecutor(PEM_AUTH);

            try {
                const request = createRequest(executor);

                assert.match(request.tls.cert as string, /BEGIN CERTIFICATE/);
                assert.match(request.tls.key as string, /BEGIN RSA PRIVATE KEY/);
                assert.strictEqual(request.fetcher, undefined, "no node:https fetcher is installed");
                assert.strictEqual(executor["_bunHttpTransport"], null);
            } finally {
                executor.dispose();
            }
        });
    });

    describe("validateCertificateRuntimeSupport", function () {

        it("accepts a PKCS#12 archive on a Bun that can present it", function () {
            RequestExecutor.validateCertificateRuntimeSupport(PFX_AUTH, new DocumentConventions());
        });

        it("throws at initialize() time on a Bun that cannot present one", function () {
            bunVersion.returns("1.3.8");

            assert.throws(
                () => RequestExecutor.validateCertificateRuntimeSupport(PFX_AUTH, new DocumentConventions()),
                /PKCS#12/);
        });

        it("accepts a PEM certificate on any Bun", function () {
            bunVersion.returns("1.3.8");
            RequestExecutor.validateCertificateRuntimeSupport(PEM_AUTH, new DocumentConventions());
        });

        it("skips the check when conventions.customFetch owns the transport", function () {
            bunVersion.returns("1.3.8");
            const conventions = new DocumentConventions();
            conventions.customFetch = () => Promise.resolve(new Response());

            RequestExecutor.validateCertificateRuntimeSupport(PFX_AUTH, conventions);
        });
    });

    describe("outside Bun", function () {

        it("installs nothing for a PKCS#12 certificate - Node presents it through the undici agent", function () {
            isBun.returns(false);
            const executor = createExecutor(PFX_AUTH);

            try {
                const request = createRequest(executor);

                assert.strictEqual(request.fetcher, undefined);
                assert.strictEqual(request.tls, undefined);
                assert.strictEqual(executor["_bunHttpTransport"], null);
            } finally {
                executor.dispose();
            }
        });
    });
});
