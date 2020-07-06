import { IDocumentStore } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { User } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";

describe("RavenDB-10638", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("afterQueryExecutedShouldBeExecutedOnlyOnce", async () => {
        const session = store.openSession();

        let counter = 0;

        const results = await session.query<User>({ collection: "users" })
            .on("afterQueryExecuted", x => counter++)
            .whereEquals("name", "Doe")
            .all();

        assertThat(results.length)
            .isEqualTo(0);
        assertThat(counter)
            .isEqualTo(1);
    });
});

