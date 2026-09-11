import sinon from "sinon";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import assert from "node:assert";
import { Certificate } from "../../src/Auth/Certificate.js";
import {
    BunHttpTransport,
    buildNodeHttpsAgentOptions,
    createNodeHttpsTransport,
    requiresNodeHttpsTransport,
    validateBunCertificateSupport
} from "../../src/Utility/BunHttpUtil.js";
import { RuntimeUtil } from "../../src/Utility/RuntimeUtil.js";

const PEM_BUNDLE = "-----BEGIN CERTIFICATE-----\nMIIcert\n-----END CERTIFICATE-----\n"
    + "-----BEGIN RSA PRIVATE KEY-----\nMIIkey\n-----END RSA PRIVATE KEY-----\n";
const PFX_BYTES = Buffer.from("pfx-bytes");

type Handler = (req: IncomingMessage, res: ServerResponse, body: Buffer) => void;

describe("BunHttpUtil", function () {

    describe("requiresNodeHttpsTransport", function () {

        it("is true for a PFX certificate - Bun's fetch ignores tls.pfx", function () {
            assert.strictEqual(requiresNodeHttpsTransport(Certificate.createPfx(PFX_BYTES)), true);
        });

        it("is false for a PEM certificate - Bun's fetch honours tls.cert/key", function () {
            assert.strictEqual(requiresNodeHttpsTransport(Certificate.createPem(PEM_BUNDLE)), false);
        });

        it("is false without a certificate", function () {
            assert.strictEqual(requiresNodeHttpsTransport(null), false);
        });
    });

    describe("buildNodeHttpsAgentOptions", function () {

        it("carries the PKCS#12 archive, its passphrase and the CA", function () {
            const ca = Buffer.from("ca-bytes");
            const options = buildNodeHttpsAgentOptions(Certificate.createPfx(PFX_BYTES, "secret", ca));

            assert.strictEqual(options.pfx, PFX_BYTES);
            assert.strictEqual(options.passphrase, "secret");
            assert.strictEqual(options.ca, ca);
            assert.strictEqual(options.keepAlive, true);
        });
    });

    describe("validateBunCertificateSupport", function () {

        let bunVersion: sinon.SinonStub;

        beforeEach(() => {
            bunVersion = sinon.stub(RuntimeUtil, "getBunVersion");
        });

        afterEach(() => {
            bunVersion.restore();
        });

        it("accepts a PKCS#12 archive on a Bun whose node:https presents it", function () {
            bunVersion.returns("1.4.0");
            validateBunCertificateSupport(Certificate.createPfx(PFX_BYTES));

            bunVersion.returns("1.5.2");
            validateBunCertificateSupport(Certificate.createPfx(PFX_BYTES));
        });

        it("rejects a PKCS#12 archive on a Bun that cannot present one, with a way out", function () {
            bunVersion.returns("1.3.8");

            assert.throws(() => validateBunCertificateSupport(Certificate.createPfx(PFX_BYTES)),
                (err: Error) => {
                    assert.match(err.message, /1\.3\.8/);
                    assert.match(err.message, /1\.4\.0 or newer/);
                    assert.match(err.message, /openssl pkcs12/);
                    return true;
                });
        });

        it("accepts a PEM certificate on any Bun", function () {
            bunVersion.returns("1.3.8");
            validateBunCertificateSupport(Certificate.createPem(PEM_BUNDLE));
        });

        it("does not apply off Bun", function () {
            bunVersion.returns(null);
            validateBunCertificateSupport(Certificate.createPfx(PFX_BYTES));
        });

        it("does not refuse to start on an unreadable version", function () {
            bunVersion.returns("not-a-version");
            validateBunCertificateSupport(Certificate.createPfx(PFX_BYTES));
        });
    });

    describe("createNodeHttpsTransport", function () {

        let server: Server;
        let baseUrl: string;
        let handler: Handler;
        let transport: BunHttpTransport;

        beforeEach(async function () {
            handler = (req, res) => res.end("ok");
            server = createServer((req, res) => {
                const chunks: Buffer[] = [];
                req.on("data", c => chunks.push(c));
                req.on("end", () => handler(req, res, Buffer.concat(chunks)));
            });

            await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
            baseUrl = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
            transport = createNodeHttpsTransport(Certificate.createPfx(PFX_BYTES));
        });

        afterEach(async function () {
            transport.close();
            await new Promise<void>(resolve => server.close(() => resolve()));
        });

        it("maps status, status text, headers and body onto a Response", async function () {
            handler = (req, res) => {
                res.writeHead(201, "Created Here", { "Custom-Header": "custom-value" });
                res.end("hello");
            };

            const response = await transport.fetch(baseUrl + "/docs");

            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.statusText, "Created Here");
            assert.strictEqual(response.headers.get("custom-header"), "custom-value");
            assert.strictEqual(await response.text(), "hello");
        });

        it("sends the method, path, query and request headers", async function () {
            let seen: { method: string, url: string, header: string };
            handler = (req, res) => {
                seen = { method: req.method, url: req.url, header: req.headers["x-raven"] as string };
                res.end("ok");
            };

            await transport.fetch(baseUrl + "/databases/db/docs?id=users%2F1", {
                method: "DELETE",
                headers: { "X-Raven": "yes" }
            });

            assert.strictEqual(seen.method, "DELETE");
            assert.strictEqual(seen.url, "/databases/db/docs?id=users%2F1");
            assert.strictEqual(seen.header, "yes");
        });

        it("sends a string body with the caller's content type", async function () {
            let seen: { body: string, contentType: string };
            handler = (req, res, body) => {
                seen = { body: body.toString(), contentType: req.headers["content-type"] };
                res.end("ok");
            };

            await transport.fetch(baseUrl + "/bulk_docs", {
                method: "POST",
                body: "{\"Commands\":[]}",
                headers: { "Content-Type": "application/json" }
            });

            assert.strictEqual(seen.body, "{\"Commands\":[]}");
            assert.strictEqual(seen.contentType, "application/json");
        });

        it("sends a Buffer body", async function () {
            let seen: Buffer;
            handler = (req, res, body) => {
                seen = body;
                res.end("ok");
            };

            await transport.fetch(baseUrl + "/attachments", { method: "PUT", body: Buffer.from([1, 2, 3]) });

            assert.deepStrictEqual([...seen], [1, 2, 3]);
        });

        it("streams a node:stream Readable body instead of buffering it", async function () {
            let seen: { body: string, transferEncoding: string, contentLength: string };
            handler = (req, res, body) => {
                seen = {
                    body: body.toString(),
                    transferEncoding: req.headers["transfer-encoding"],
                    contentLength: req.headers["content-length"]
                };
                res.end("ok");
            };

            await transport.fetch(baseUrl + "/attachments", {
                method: "PUT",
                body: Readable.from([Buffer.from("chunk-one"), Buffer.from("chunk-two")]) as any
            });

            assert.strictEqual(seen.body, "chunk-onechunk-two");
            assert.strictEqual(seen.transferEncoding, "chunked");
            assert.strictEqual(seen.contentLength, undefined);
        });

        it("declares that it accepts a node:stream Readable body", function () {
            assert.strictEqual(transport.fetch.acceptsNodeStreamBody, true);
        });

        it("encodes a FormData body and derives its multipart content type", async function () {
            let seen: { body: string, contentType: string };
            handler = (req, res, body) => {
                seen = { body: body.toString(), contentType: req.headers["content-type"] };
                res.end("ok");
            };

            const form = new FormData();
            form.append("main", new Blob(["{}"], { type: "application/json" }));

            await transport.fetch(baseUrl + "/bulk_docs", { method: "POST", body: form });

            assert.match(seen.contentType, /^multipart\/form-data; boundary=/);
            assert.match(seen.body, /name="main"/);
        });

        it("decompresses a gzip response and drops the encoding headers", async function () {
            const payload = gzipSync(Buffer.from("{\"Results\":[]}"));
            handler = (req, res) => {
                res.writeHead(200, { "Content-Encoding": "gzip", "Content-Length": String(payload.length) });
                res.end(payload);
            };

            const response = await transport.fetch(baseUrl + "/docs");

            assert.strictEqual(await response.text(), "{\"Results\":[]}");
            assert.strictEqual(response.headers.get("content-encoding"), null);
            assert.strictEqual(response.headers.get("content-length"), null);
        });

        it("gives a 304 a null body instead of failing to build the Response", async function () {
            handler = (req, res) => {
                res.writeHead(304, { ETag: "\"5\"" });
                res.end();
            };

            const response = await transport.fetch(baseUrl + "/docs");

            assert.strictEqual(response.status, 304);
            assert.strictEqual(response.body, null);
            assert.strictEqual(response.headers.get("etag"), "\"5\"");
        });

        it("streams the response body instead of buffering it", async function () {
            let release: () => void;
            const released = new Promise<void>(resolve => release = resolve);

            handler = async (req, res) => {
                res.writeHead(200);
                res.write("first");
                await released;
                res.end("second");
            };

            const response = await transport.fetch(baseUrl + "/stream");
            const reader = response.body.getReader();

            const first = await reader.read();
            assert.strictEqual(Buffer.from(first.value).toString(), "first");

            release();

            const rest: string[] = [];
            for (; ;) {
                const chunk = await reader.read();
                if (chunk.done) {
                    break;
                }
                rest.push(Buffer.from(chunk.value).toString());
            }
            assert.strictEqual(rest.join(""), "second");
        });

        it("rejects with an AbortError when the signal is aborted mid-request", async function () {
            const controller = new AbortController();
            handler = (req, res) => {
                controller.abort();
                // never responds - only the abort can settle the request
            };

            await assert.rejects(
                transport.fetch(baseUrl + "/docs", { signal: controller.signal }),
                (err: Error) => {
                    assert.strictEqual(err.name, "AbortError");
                    return true;
                });
        });

        it("rejects with an AbortError when the signal is already aborted", async function () {
            await assert.rejects(
                transport.fetch(baseUrl + "/docs", { signal: AbortSignal.abort() }),
                (err: Error) => {
                    assert.strictEqual(err.name, "AbortError");
                    return true;
                });
        });

        it("rejects when the connection fails", async function () {
            await assert.rejects(transport.fetch("http://127.0.0.1:1/docs"));
        });

        it("closes the pooled connections on close()", async function () {
            const closedSockets: Promise<void>[] = [];
            handler = (req, res) => {
                closedSockets.push(new Promise<void>(resolve => req.socket.on("close", () => resolve())));
                res.end("ok");
            };

            await (await transport.fetch(baseUrl + "/docs")).text();
            transport.close();

            await Promise.all(closedSockets);
        });

        it("reuses one keep-alive connection across requests", async function () {
            const sockets = new Set<unknown>();
            handler = (req, res) => {
                sockets.add(req.socket);
                res.end("ok");
            };

            await (await transport.fetch(baseUrl + "/one")).text();
            await (await transport.fetch(baseUrl + "/two")).text();

            assert.strictEqual(sockets.size, 1);
        });
    });
});
