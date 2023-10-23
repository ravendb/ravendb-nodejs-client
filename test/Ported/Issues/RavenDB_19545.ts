import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_19545Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("removingTimeSeriesEntryShouldAffectCache", async () => {
        const docId = "user/1";
        const timeSeriesName = "HeartRates";
        const tag = "watches/fitbit";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Lev";
            await session.store(user, docId);

            const tsf = session.timeSeriesFor(docId, timeSeriesName);
            tsf.append(testContext.utcToday().add("23", "hours").toDate(), 67, tag);
            await session.saveChanges();

            const entries = await session.timeSeriesFor(docId, timeSeriesName).get();
            assertThat(entries)
                .hasSize(1);

            session.timeSeriesFor(docId, timeSeriesName).delete(null, null);
            await session.saveChanges();

            const entries2 = await session.timeSeriesFor(docId, timeSeriesName).get();
            assertThat(entries2)
                .isNull();
        }
    });

    it("removingTimeSeriesEntryShouldAffectCache2", async function() {
        const docId = "user/1";
        const timeSeriesName = "HeartRates";
        const tag = "watches/fitbit";
        const baseline = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Lev";
            await session.store(user, docId);

            const tsf = session.timeSeriesFor(docId, timeSeriesName);
            for (let i = 1; i <= 10; i++) {
                tsf.append(baseline.clone().add(i, "days").toDate(), i, tag);
                await session.saveChanges();
            }

            // in java we add one millisecond as we always operate on ms precision
            let entries = await session.timeSeriesFor(docId, timeSeriesName)
                .get(
                    baseline.clone().add(1, "millisecond").add(9, "days").toDate(),
                    baseline.clone().add(11, "days").toDate()
                );
            assertThat(entries)
                .hasSize(1);

            // in java we add one millisecond as we always operate on ms precision
            entries = await session.timeSeriesFor(docId, timeSeriesName)
                .get(
                    baseline.clone().add(1, "millisecond").add(3, "days").toDate(),
                    baseline.clone().add(8, "days").toDate()
                );
            assertThat(entries)
                .hasSize(5);

            session.timeSeriesFor(docId, timeSeriesName)
                .delete(baseline.clone().add(4, "days").toDate(), baseline.clone().add(7, "days").toDate());
            await session.saveChanges();

            const entries2 = await session.timeSeriesFor(docId, timeSeriesName).get();
            assertThat(entries2)
                .hasSize(6);
        }
    });

    it("removingTimeSeriesEntryShouldAffectCache3", async function() {
        const docId = "user/1";
        const timeSeriesName = "HeartRates";
        const tag = "watches/fitbit";

        const baseline = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Lev";
            await session.store(user, docId);

            const tsf = session.timeSeriesFor(docId, timeSeriesName);
            for (let i = 1; i <= 10; i++) {
                tsf.append(baseline.clone().add(i, "days").toDate(), i, tag);
                await session.saveChanges();
            }

            let entries = await session.timeSeriesFor(docId, timeSeriesName)
                .get(baseline.clone().add(9, "days").add(1, "seconds").toDate(), baseline.clone().add(11, "days").toDate());
            assertThat(entries)
                .hasSize(1);

            entries = await session.timeSeriesFor(docId, timeSeriesName)
                .get(null, baseline.clone().add(8, "days").toDate());
            assertThat(entries)
                .hasSize(8);

            session.timeSeriesFor(docId, timeSeriesName)
                .delete(null, baseline.clone().add(7, "days").toDate());
            await session.saveChanges();

            const entries2 = await session.timeSeriesFor(docId, timeSeriesName).get();
            assertThat(entries2)
                .hasSize(3);
        }
    });

    it("removingTimeSeriesEntryShouldAffectCache4", async function () {
        const docId = "user/1";
        const timeSeriesName = "HeartRates";
        const tag = "watches/fitbit";

        const baseline = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Lev";
            await session.store(user, docId);

            const tsf = session.timeSeriesFor(docId, timeSeriesName);
            for (let i = 0; i <= 10; i++) {
                tsf.append(baseline.add(i, "days").toDate(), i, tag);
                await session.saveChanges();
            }

            // in java we add one millisecond as we always operate on ms precision
            let entries = await session.timeSeriesFor(docId, timeSeriesName)
                .get(baseline.clone().add(9, "days").add(1, "millisecond").toDate(), baseline.clone().add(11, "days").toDate());
            assertThat(entries)
                .hasSize(1);

            // in java we add one millisecond as we always operate on ms precision
            entries = await session.timeSeriesFor(docId, timeSeriesName).get(
                baseline.clone().add(1, "day").add(1, "millisecond").toDate(),
                null
            );
            assertThat(entries)
                .hasSize(9);

            session.timeSeriesFor(docId, timeSeriesName)
                .delete(baseline.clone().add(6, "days").toDate(), null);
            session.saveChanges();

            const entries2 = await session.timeSeriesFor(docId, timeSeriesName)
                .get();
            assertThat(entries2)
                .hasSize(5);

        }
    })
});

