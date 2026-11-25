import { DocumentChange, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_19945", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("willNotSendEvenForEachChangeForAggressiveCaching", async () => {
        const count = 100;
        let received = 0;

        const requestExecutor = store.getRequestExecutor();
        const cacheGeneration = requestExecutor.cache.generation;

        await store.aggressivelyCache(async () => {
            const changes = store.changes();
            await changes.ensureConnectedNow();

            const forAllDocuments = changes.forAllDocuments();
            await forAllDocuments.ensureSubscribedNow();
            forAllDocuments.on("data", (_: DocumentChange) => received++);

            for (let i = 0; i < count / 10; i++) {
                const session = store.openSession();
                for (let j = 0; j < count / 10; j++) {
                    await session.store({});
                }
                await session.saveChanges();
            }
        });

        assertThat(await testContext.waitForValue(async () => received, count, { timeout: 30_000 })).isEqualTo(count);
        assertThat(requestExecutor.cache.generation).isNotEqualTo(cacheGeneration);
        assertThat(cacheGeneration + count > requestExecutor.cache.generation).isTrue();
    });
});
