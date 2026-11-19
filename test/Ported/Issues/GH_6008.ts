import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Item {
}

describe("GH_6008", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can get is loaded true for new value", async () => {
        const session = store.openSession();
        const item = new Item();
        await session.store(item, "items-one", { changeVector: null });

        assertThat(session.advanced.isLoaded("items-one")).isTrue();
    });
});
