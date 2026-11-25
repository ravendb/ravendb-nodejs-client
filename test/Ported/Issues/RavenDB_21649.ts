import { addHours, addMinutes, hoursToMilliseconds } from "date-fns";
import { IDocumentStore, TimeSeriesEntry } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_21649", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("timeSeriesStreamQueryWithOffset_ShouldNotReturnPartialData", async () => {
        const numOfEntries = 60;
        const baseline = new Date(Date.UTC(2026, 0, 1));

        {
            const session = store.openSession();
            await session.store(new User(), "karmel");
            const ts = session.timeSeriesFor("karmel", "heartrate");
            for (let i = 0; i < numOfEntries; i++) {
                ts.append(addMinutes(baseline, i), i);
            }
            await session.saveChanges();
        }

        const offset = hoursToMilliseconds(12);
        const baselineWithOffset = addHours(baseline, 12);

        const stream = await store.openSession().timeSeriesFor("karmel", "heartrate")
            .stream(baseline, addHours(baseline, 1), offset);

        let i = 0;
        for await (const entry of stream as AsyncIterable<TimeSeriesEntry>) {
            assertThat(entry.timestamp.getTime()).isEqualTo(addMinutes(baselineWithOffset, i).getTime());
            assertThat(entry.value).isEqualTo(i);
            i++;
        }

        assertThat(i).isEqualTo(numOfEntries);
    });
});
