import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Doc {
    public id: string;
}

describe("AggressiveCacheWithLazy", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(Object.assign(new Doc(), { id: "doc-1" }));
        await session.saveChanges();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function lazilyLoad(ids: string[]) {
        const session = store.openSession();
        return store.aggressivelyCacheFor(5 * 60_000, async () => {
            const lazies = ids.map(id => session.advanced.lazily.load(id, Doc));
            await lazies[0].getValue();
            return session.advanced.numberOfRequests;
        });
    }

    it("aggresiveCacheWithLazyTest", async () => {
        assertThat(await lazilyLoad(["doc-1"])).isEqualTo(1);
        assertThat(await lazilyLoad(["doc-1"])).isEqualTo(0);
    });

    it("aggresiveCacheWithLazyTest_MixedMode", async () => {
        await lazilyLoad(["doc-1", "doc-2"]);
        assertThat(await lazilyLoad(["doc-1"])).isEqualTo(0);
    });

    it("aggresiveCacheWithLazyTest_Partly", async () => {
        assertThat(await lazilyLoad(["doc-1"])).isEqualTo(1);
        assertThat(await lazilyLoad(["doc-1"])).isEqualTo(0);

        // doc-2 was never loaded, so the multi-get has to go to the server
        assertThat(await lazilyLoad(["doc-1", "doc-2"])).isEqualTo(1);
    });
});
