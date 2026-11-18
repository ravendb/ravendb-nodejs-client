import { AbstractCsharpIndexCreationTask, Explanations, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Item {
    public list: string[];
}

class NormIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from item in docs.Items select new { list = item.list.ToArray() }.Boost(5)";
        this.index("list", "Search");
    }
}

const expectedExplanation = "1 = (MATCH) ConstantScoreQuery(list:null*^10.0), product of:\n  10 = boost\n  0.1 = queryNorm\n";

describe("RavenDB_18619", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("normsAreGeneratedCorrectlyOnWholeDocument", async () => {
        {
            const session = store.openSession();
            const entry = new Item();
            entry.list = [
                "Lorem ipsum dolor sit amet", "consectetur adipiscing elit", ", sed do eiusmod tempor incididunt ut labore ",
                "et dolore magna aliqua. Ut enim ad ", "minim veniam, quis nostrud", " exercitation ullamco laboris nisi ut",
                " aliquip ex ea commodo consequat. ", "Duis aute", " irure dolor in reprehenderit in voluptate velit esse cillum dolore",
                " eu fugiat nulla pariatur. ", "Excepteur sint occaecat cupidatat", " non proident, sunt in", " culpa qui officia deserunt ",
                "mollit anim id est laborum."
            ];
            await session.store(entry, "Items/1");
            await session.saveChanges();
        }

        await new NormIndex().execute(store);
        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let explanations: Explanations;
            const results = await session.query(Item, NormIndex)
                .search("list", "null*")
                .boost(10)
                .includeExplanations(e => explanations = e)
                .all();

            assertThat(results)
                .isNotEmpty();

            const details = explanations.getExplanations("Items/1");
            assertThat(details)
                .isNotNull();
            assertThat(details)
                .isNotEmpty();
            assertThat(details[0])
                .isEqualTo(expectedExplanation);
        }

        {
            const session = store.openSession();
            let explanations2: Explanations;
            const queryResult = await session.query(Item, NormIndex)
                .search("list", "null*")
                .boost(10)
                .includeExplanations(e => explanations2 = e)
                .getQueryResult();

            const explanations1 = queryResult.explanations;

            assertThat(explanations1)
                .isNotNull();
            assertThat(explanations2)
                .isNotNull();
            assertThat(explanations1["Items/1"][0])
                .isEqualTo(expectedExplanation);
            assertThat(explanations2.getExplanations("Items/1")[0])
                .isEqualTo(expectedExplanation);
        }
    });
});
