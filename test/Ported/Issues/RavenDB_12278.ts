import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
}

class OtherDocument {
    public id: string;
}

describe("RavenDB_12278", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function range(start: number, count: number, prefix: string) {
        return Array.from({ length: count }, (_, i) => prefix + (start + i));
    }

    async function storeAll(ids: string[], clazz: new () => Document | OtherDocument) {
        const session = store.openSession();
        for (const id of ids) {
            await session.store(Object.assign(new clazz(), { id }));
        }
        await session.saveChanges();
    }

    async function loadAndCountCached(
        duration: number, ids: string[], clazz: new () => Document | OtherDocument, cachedBefore: number) {
        const session = store.openSession();
        const cache = session.advanced.requestExecutor.cache;

        return store.aggressivelyCacheFor(duration, async () => {
            assertThat(cache.numberOfItems).isEqualTo(cachedBefore);
            const related = await session.load(ids, clazz);
            assertThat(Object.values(related).filter(x => x).length).isEqualTo(ids.length);
            return cache.numberOfItems;
        });
    }

    it("aggressivelyCachedSessionShouldGenerateProperCacheKeyForPostRequest", async () => {
        const ids1 = range(1, 50, "my-quite-long-document-indentifier/");
        const ids2 = range(1, 50, "my-quite-long-other-document-indentifier/");

        await storeAll(ids1, Document);
        await storeAll(ids2, OtherDocument);

        assertThat(await loadAndCountCached(30_000_000_000, ids1, Document, 0)).isEqualTo(1);
        assertThat(await loadAndCountCached(33_000_000_000, ids2, OtherDocument, 1)).isEqualTo(2);
        assertThat(await loadAndCountCached(30_000_000_000, ids1, Document, 2)).isEqualTo(2);
        assertThat(await loadAndCountCached(33_000_000_000, ids2, OtherDocument, 2)).isEqualTo(2);
    });

    it("aggressivelyCachedSessionShouldGenerateProperCacheKeyForPostRequestUsingSameCollection", async () => {
        const ids1 = range(1, 50, "my-quite-very-long-document-indentifier/");
        const ids2 = range(51, 100, "my-quite-very-long-document-indentifier/");

        await storeAll([...ids1, ...ids2], Document);

        assertThat(await loadAndCountCached(30_000, ids1, Document, 0)).isEqualTo(1);
        assertThat(await loadAndCountCached(30_000, ids2, Document, 1)).isEqualTo(2);
    });
});
