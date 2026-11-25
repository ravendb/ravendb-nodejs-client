import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
    public name: string;
}

describe("RavenDB_10499", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canLoadAgressivelyCachingAfterDbInitialized", async () => {
        const id = "myDocuments/123";

        {
            const session = store.openSession();
            const loaded = await session.load(id, Document);
            if (!loaded) {
                await session.store(Object.assign(new Document(), { id, name: "document" }));
                await session.saveChanges();
            }
        }

        const session = store.openSession();
        const loaded = await store.aggressivelyCacheFor(60_000, () => session.load(id, Document));
        assertThat(loaded).isNotNull();
    });
});
