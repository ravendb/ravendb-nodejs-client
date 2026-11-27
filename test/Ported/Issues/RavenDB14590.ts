import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { addMinutes } from "date-fns";

describe("RavenDB14590", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can get updates time series values using include", async () => {
        {
            const session = store.openSession();
            await session.store({}, "users/1");
            await session.saveChanges();
        }

        const baseline = testContext.utcToday();

        for (let i = 0; i < 3; i++) {
            const session = store.openSession();

            const doc = await session.load<object>("users/1", {
                includes: include => include.includeTimeSeries("speed", null, null)
            });

            const numOfRequests = session.advanced.numberOfRequests;

            const series = await session.timeSeriesFor(doc, "speed").get(null, null);

            assertThat(session.advanced.numberOfRequests).isEqualTo(numOfRequests);
            assertThat(series).hasSize(i);

            for (let j = 0; j < i; j++) {
                assertThat(series[j].value).isEqualTo(j);
            }

            session.timeSeriesFor(doc, "speed").append(addMinutes(baseline, i), [i]);

            await session.saveChanges();
        }
    });
});
