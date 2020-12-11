import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15826", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIncludeLazyLoadITemThatIsAlreadyOnSession", async () => {
        {
            const session = store.openSession();
            await session.store(new Item(), "items/a");
            await session.store(new Item(), "items/b");
            const itemC = new Item();
            itemC.refs = [ "items/a", "items/b" ];
            await session.store(itemC, "items/c");
            const itemD = new Item();
            itemD.refs = [ "items/a" ];
            await session.store(itemD, "items/d");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.include("refs").load("items/d", Item); // include, some loaded
            const a = await session.load<Item>("items/c", Item); // include, some loaded
            const items = await session.advanced.lazily.load(a.refs, Item);
            await session.advanced.eagerly.executeAllPendingLazyOperations();
            const itemsMap = await items.getValue();
            assertThat(a.refs)
                .hasSize(Object.keys(itemsMap).length);
            assertThat(Object.values(itemsMap).filter(x => !x))
                .hasSize(0);
        }
    });
});

class Item {
    public refs: string[];
}