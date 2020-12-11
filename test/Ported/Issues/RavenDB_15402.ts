import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15402", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("getCountersShouldBeCaseInsensitive", async () => {
        const id = "companies/1";

        {
            const session = store.openSession();
            await session.store(new Company(), id);
            session.countersFor(id)
                .increment("Likes", 999);
            session.countersFor(id)
                .increment("DisLikes", 999);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>(id, Company);
            const counters = await session.countersFor(company)
                .get(["likes", "dislikes"]);

            assertThat(counters)
                .hasSize(2);
            assertThat(counters["likes"])
                .isEqualTo(999);
            assertThat(counters["dislikes"])
                .isEqualTo(999);
        }
    });
});
