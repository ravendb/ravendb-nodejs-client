import { addMinutes } from "date-fns";
import { IDocumentStore, TimeSeriesEntry } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_18659", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canStreamTimeSeriesWithFromAndTo", async () => {
        const baseline = new Date(Date.UTC(2026, 0, 1));

        {
            const session = store.openSession();
            await session.store(new User(), "karmel");
            const ts = session.timeSeriesFor("karmel", "heartrate");
            for (let i = 0; i < 10; i++) {
                ts.append(addMinutes(baseline, i), i, "stream");
            }
            await session.saveChanges();
        }

        const stream = await store.openSession().timeSeriesFor("karmel", "heartrate")
            .stream(addMinutes(baseline, 1), addMinutes(baseline, 9));

        let i = 1;
        for await (const entry of stream as AsyncIterable<TimeSeriesEntry>) {
            assertThat(entry.timestamp.getTime()).isEqualTo(addMinutes(baseline, i).getTime());
            assertThat(entry.value).isEqualTo(i);
            assertThat(entry.tag).isEqualTo("stream");
            i++;
        }

        assertThat(i).isEqualTo(10);
    });
});
