import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_24423Test", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSortBengaliAlphabetByOrderByAlphaNumeric", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Dto(), { title: "বাংলাবর্ণমালাবালিপি" }));
            await session.store(Object.assign(new Dto(), { title: "বাংলাবর্ণমালা1" }));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const results = await session.advanced.documentQuery(Dto)
                .waitForNonStaleResults()
                .orderBy("title", "AlphaNumeric")
                .all();

            assertThat(results)
                .isNotNull();
            assertThat(results)
                .hasSize(2);
        }
    });
});

class Dto {
    public id: string;
    public title: string;
    public intValue: number;
}
