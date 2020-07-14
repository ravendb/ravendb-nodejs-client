import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RDBC_387", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldStoreSingleId", async () => {
        let userIdViaSessionId: string;
        let userIdViaBulkInsert: string;

        {
            const session = store.openSession();

            const u = Object.assign(new User(), { name: "John" });
            await session.store(u);
            await session.saveChanges();

            userIdViaSessionId = u.id;
        }

        {
            const bulkInsert = store.bulkInsert();

            const u = Object.assign(new User(), { name: "Marcin" });
            await bulkInsert.store(u);

            userIdViaBulkInsert = u.id;

            // flush data and finish
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const sessionUser = await session.load<object>(userIdViaSessionId, Object);
            const bulkInsertUser = await session.load<object>(userIdViaBulkInsert, Object);

            assertThat(sessionUser["id"])
                .isNotNull(); // this is different than in java
            assertThat(sessionUser["Id"])
                .isNull();

            assertThat(bulkInsertUser["id"])
                .isNotNull(); // this is different than in java
            assertThat(bulkInsertUser["Id"])
                .isNull();
        }
    });
});