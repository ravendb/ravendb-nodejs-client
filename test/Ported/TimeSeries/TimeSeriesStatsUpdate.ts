import { GetTimeSeriesOperation, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("TimeSeriesStatsUpdateTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("deleteRangeForNonExistingTimeSeriesShouldBeNoOp", async () => {
        {
            const session = store.openSession();
            await session.store(new User(), "users/1-A");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // deleting a range of a time series that was never appended to must not create anything
            session.timeSeriesFor("users/1-A", "HR").delete();
            await session.saveChanges();
        }

        const ts = await store.operations.send(new GetTimeSeriesOperation("users/1-A", "HR", null, null));
        assertThat(ts)
            .isNull();
    });
});
