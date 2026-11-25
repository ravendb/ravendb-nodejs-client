import { DocumentStore, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Item {
    public constructor(public name?: string) {
    }
}

describe("RavenDB_22739", function () {

    let store1: IDocumentStore;
    const otherStores: IDocumentStore[] = [];

    beforeEach(async function () {
        store1 = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        for (const store of otherStores.splice(0)) {
            store.dispose();
        }
        await disposeTestDocumentStore(store1);
    });

    it("aggressiveCacheChangeNotificationShouldInvalidateCache", async () => {
        for (let i = 0; i < 3; i++) {
            const store = new DocumentStore(store1.urls, store1.database);
            store.initialize();
            otherStores.push(store);
        }

        const stores = [store1, ...otherStores];

        {
            const session = store1.openSession();
            await session.store(new Item("Joe"), "items/1");
            await session.saveChanges();
        }

        for (const store of stores) {
            await store.aggressivelyCache(async () => {
                assertThat(await store1.openSession().load("items/1", Item)).isNotNull();
            });
        }

        {
            const session = store1.openSession();
            await session.delete("items/1");
            await session.saveChanges();
        }

        for (const store of stores) {
            const item = await testContext.waitForValue(
                () => store.aggressivelyCache(() => store.openSession().load("items/1", Item)),
                null);
            assertThat(item).isNull();
        }
    });
});
