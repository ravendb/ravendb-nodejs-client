import { IDocumentStore, TimeSeriesRawResult } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15792Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canQueryTimeSeriesWithSpacesInName", async () => {
        const documentId = "users/ayende";

        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();

            await session.store(new User(), documentId);

            const tsf = session.timeSeriesFor(documentId, "gas m3 usage");
            tsf.append(baseLine.toDate(), 1);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.advanced.rawQuery(`declare timeseries out()
{
    from "gas m3 usage"
}
from Users as u
select out()`, TimeSeriesRawResult);

            const result = await query.first();

            assertThat(result)
                .isNotNull();

            const results = result.results;
            assertThat(results)
                .hasSize(1);
        }
    });

});
