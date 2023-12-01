import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";


describe("RavenDB_17699Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("multipleConditionalGetQueries", async () => {
        {
            const session = store.openSession();
            const book = new Item();
            book.name = "book";
            await session.store(book, "items/book");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const bookLazy = session.advanced.lazily
                .conditionalLoad("items/book", "bad-value", Item);
            await session.advanced.eagerly.executeAllPendingLazyOperations();

            assertThat((await bookLazy.getValue()).entity)
                .isNotNull();
        }
        {
            const session = store.openSession();
            const bookLazy = session.advanced.lazily
                .conditionalLoad("items/book", "bad-value", Item);
            await session.advanced.eagerly.executeAllPendingLazyOperations();
            assertThat((await bookLazy.getValue()).entity)
                .isNotNull();
        }
    });
});

class Item {
    name: string;
}
