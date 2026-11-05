import assert from "node:assert";
import { syncBuiltinESMExports } from "node:module";
import zlib from "node:zlib";
import sinon from "sinon";
import { DocumentConventions } from "../../src/Documents/Conventions/DocumentConventions.js";
import { BulkInsertWriter } from "../../src/Documents/BulkInsert/BulkInsertWriter.js";
import { RequestExecutor } from "../../src/Http/RequestExecutor.js";
import { HttpRequestParameters } from "../../src/Primitives/Http.js";

class LocalRequestExecutor extends RequestExecutor {
    public constructor() {
        super("db", null, new DocumentConventions());
    }
}

describe("HTTP compression without zstd support", function () {

    afterEach(function () {
        sinon.restore();
        syncBuiltinESMExports();
    });

    it("sends a request body uncompressed when zstd compression fails", async function () {
        sinon.replace(zlib, "zstdCompressSync", sinon.fake.throws(new TypeError("zstd is not supported")));
        syncBuiltinESMExports();
        const executor = new LocalRequestExecutor();
        const body = "x".repeat(4096);
        const params: HttpRequestParameters = { uri: "http://127.0.0.1/", method: "POST", body };

        try {
            await executor["applyHttpCompression"](params);
        } finally {
            executor.dispose();
        }

        assert.strictEqual(params.headers["Content-Encoding"], undefined);
        assert.strictEqual(await new Response(params.body as ReadableStream).text(), body);
    });

    it("leaves Accept-Encoding to fetch when the request does not go through the Node transport", async function () {
        const executor = new LocalRequestExecutor();
        sinon.stub(executor, "getHttpAgent").resolves(null);
        const params: HttpRequestParameters = { uri: "http://127.0.0.1/", method: "GET" };

        try {
            await executor["applyHttpCompression"](params);
        } finally {
            executor.dispose();
        }

        assert.strictEqual(params.headers["Accept-Encoding"], undefined);
    });

    it("falls back to gzip for bulk insert when zstd streams are unavailable", async function () {
        sinon.stub(zlib, "createZstdCompress").value(undefined);
        syncBuiltinESMExports();
        const writer = new BulkInsertWriter();

        assert.strictEqual(await writer.ensureStream("Zstd"), "Gzip");
        assert.ok(writer.compressedStream instanceof zlib.Gzip);

        writer.requestBodyStream.destroy();
    });
});
