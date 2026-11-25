import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Product {
    public id: string;
    public name: string;
}

describe("RavenDB_23188", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("on query", async () => {
        {
            const session = store.openSession();
            await session.advanced.documentQuery(Product)
                .noCaching()
                .all();

            assertThat(session.advanced.requestExecutor.cache.numberOfItems)
                .isEqualTo(0);
        }

        {
            const session = store.openSession();
            await session.advanced.documentQuery(Product).all();

            assertThat(session.advanced.requestExecutor.cache.numberOfItems)
                .isEqualTo(1);
        }
    });
});
