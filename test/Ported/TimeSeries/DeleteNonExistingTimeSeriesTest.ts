import { GetTimeSeriesOperation, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("DeleteNonExistingTimeSeriesTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("deleteRangeForNonExistingTimeSeriesShouldBeNoOp", async () => {
        {
            const session = store.openSession();
            await session.store(new User(), "users/1-A");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // delete the full range of a time series that does not exist - must be a no-op
            session.timeSeriesFor("users/1-A", "HR")
                .delete();
            await session.saveChanges();
        }

        const ts = await store.operations.send(
            new GetTimeSeriesOperation("users/1-A", "HR"));
        assertThat(ts)
            .isNull();
    });
});
