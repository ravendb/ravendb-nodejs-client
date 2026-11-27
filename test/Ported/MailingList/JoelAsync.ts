import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Dummy {
    public id: string;
    public name: string;
}

describe("JoelAsync", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("async query", async () => {
        const session = store.openSession();
        await session.query(Dummy).all();

        const results2 = await session.query(Dummy).all();

        assertThat(results2).hasSize(0);
    });
});
