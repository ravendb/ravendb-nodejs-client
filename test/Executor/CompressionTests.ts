import sinon from "sinon";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";

import assert from "node:assert";
import DocumentStore, {
    IDocumentStore,
    GetDatabaseNamesCommand,
    DocumentConventions,
} from "../../src/index.js";
import { SucceedRequestEventArgs } from "../../src/Documents/Session/SessionEvents.js";
import { RuntimeUtil } from "../../src/Utility/RuntimeUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";

describe("Compression", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const expectedDefaultAcceptEncoding = () => RuntimeUtil.fetchDecodesZstd() ? "zstd, gzip, deflate, br" : null;

    it("is active by default", async () => {
        const exec = store.getRequestExecutor();
        const cmd = new GetDatabaseNamesCommand(0, 5);
        const createReqSpy = exec["_createRequest"] = sinon.spy(exec["_createRequest"]);

        await exec.execute(cmd);
        const reqParams = createReqSpy.lastCall.returnValue;
        assert.strictEqual(reqParams.headers["Accept-Encoding"] ?? null, expectedDefaultAcceptEncoding());
    });

    it("can be turned on on demand", async () => {
        const store2 = new DocumentStore(store.urls, store.database);
        try {
            store2.conventions.useHttpDecompression = true;
            store2.initialize();

            const exec = store2.getRequestExecutor();
            const cmd = new GetDatabaseNamesCommand(0, 5);
            const createReqSpy = exec["_createRequest"] = sinon.spy(exec["_createRequest"]);

            await exec.execute(cmd);
            const reqParams = createReqSpy.lastCall.returnValue;
            assert.strictEqual(reqParams.headers["Accept-Encoding"] ?? null, expectedDefaultAcceptEncoding());
        } finally {
            if (store2) {
                store2.dispose();
            }
        }
    });

    it("can be turned off on demand", async () => {
        const store2 = new DocumentStore(store.urls, store.database);
        try {
            store2.conventions.useHttpDecompression = false;
            store2.initialize();

            const exec = store2.getRequestExecutor();
            const cmd = new GetDatabaseNamesCommand(0, 5);
            const createReqSpy = exec["_createRequest"] = sinon.spy(exec["_createRequest"]);

            await exec.execute(cmd);
            const reqParams = createReqSpy.lastCall.returnValue;
            assertThat(reqParams.headers["Accept-Encoding"])
                .isEqualTo("identity");
        } finally {
            if (store2) {
                store2.dispose();
            }
        }
    });

    async function storeAndLoad(configure: (conventions: DocumentConventions) => void) {
        const store2 = new DocumentStore(store.urls, store.database);
        try {
            configure(store2.conventions);
            store2.initialize();

            const requests: SucceedRequestEventArgs[] = [];
            store2.getRequestExecutor().on("succeedRequest", e => requests.push(e));

            const session = store2.openSession();
            await session.store({ name: "x".repeat(4096) }, "items/1");
            await session.saveChanges();

            const loaded = await store2.openSession().load<{ name: string }>("items/1");
            assert.strictEqual(loaded.name, "x".repeat(4096));

            return {
                save: requests.find(e => e.url.includes("/bulk_docs")),
                load: requests.find(e => e.url.includes("/docs?") && e.request.method !== "POST")
            };
        } finally {
            store2.dispose();
        }
    }

    it("compresses request bodies with zstd by default", async () => {
        const { save } = await storeAndLoad(() => {});

        assert.strictEqual(save.request.headers["Content-Encoding"], "zstd");
        assert.ok(save.request.body instanceof ReadableStream);
    });

    it("compresses request bodies with gzip when configured", async () => {
        const { save } = await storeAndLoad(conventions => conventions.httpCompressionAlgorithm = "Gzip");

        assert.strictEqual(save.request.headers["Content-Encoding"], "gzip");
        assert.ok(save.request.body instanceof ReadableStream);
    });

    it("streams small request bodies uncompressed", async () => {
        const requests: SucceedRequestEventArgs[] = [];
        store.getRequestExecutor().on("succeedRequest", e => requests.push(e));

        const session = store.openSession();
        session.delete("items/does-not-exist");
        await session.saveChanges();

        const save = requests.find(e => e.url.includes("/bulk_docs"));
        assert.strictEqual(save.request.headers["Content-Encoding"], undefined);
        assert.ok(save.request.body instanceof ReadableStream);
    });

    it("sends plain request bodies when compression is turned off", async () => {
        const { save } = await storeAndLoad(conventions => conventions.useHttpCompression = false);

        assert.strictEqual(save.request.headers["Content-Encoding"], undefined);
        assert.strictEqual(typeof save.request.body, "string");
    });

    it("accepts zstd responses only where fetch decodes them", async () => {
        const { load } = await storeAndLoad(conventions => conventions.useHttpDecompression = true);

        if (RuntimeUtil.fetchDecodesZstd()) {
            assert.strictEqual(load.request.headers["Accept-Encoding"], "zstd, gzip, deflate, br");
            assert.strictEqual(load.response.headers.get("Content-Encoding"), "zstd");
        } else {
            assert.ok(!String(load.request.headers["Accept-Encoding"] ?? "").includes("zstd"));
        }
    });
});
