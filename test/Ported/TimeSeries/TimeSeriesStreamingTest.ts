import { addMinutes, addMonths } from "date-fns";
import {
    IDocumentStore,
    TimeSeriesAggregationResult,
    TimeSeriesEntry,
    TypedTimeSeriesEntry
} from "../../../src/index.js";
import { HEADERS } from "../../../src/Constants.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";
import { HeartRateMeasure } from "./TimeSeriesTypedSession.js";

describe("TimeSeriesStreamingTests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const baseline = new Date(Date.UTC(2026, 0, 1));

    async function readAll<T>(stream: AsyncIterable<T>) {
        const items: T[] = [];
        for await (const item of stream) {
            items.push(item);
        }
        return items;
    }

    async function storeHeartrate() {
        const session = store.openSession();
        await session.store(new User(), "karmel");
        const ts = session.timeSeriesFor("karmel", "heartrate");
        for (let i = 0; i < 10; i++) {
            ts.append(addMinutes(baseline, i), i, "stream");
        }
        await session.saveChanges();
    }

    async function storeTypedHeartRates(...ids: string[]) {
        const session = store.openSession();
        for (const [factor, id] of ids.entries()) {
            await session.store(new User(), id);
            const ts = session.timeSeriesFor(id, HeartRateMeasure);
            for (let i = 0; i < 10; i++) {
                ts.append(addMinutes(baseline, i), Object.assign(new HeartRateMeasure(), { heartRate: i * (factor + 1) }), "stream");
            }
        }
        await session.saveChanges();
    }

    it("canStream", async () => {
        await storeHeartrate();

        const entries = await readAll<TimeSeriesEntry>(
            await store.openSession().timeSeriesFor("karmel", "heartrate").stream());

        assertThat(entries).hasSize(10);
        for (const [i, entry] of entries.entries()) {
            assertThat(entry instanceof TimeSeriesEntry).isTrue();
            assertThat(entry.timestamp.getTime()).isEqualTo(addMinutes(baseline, i).getTime());
            assertThat(entry.value).isEqualTo(i);
            assertThat(entry.tag).isEqualTo("stream");
        }
    });

    it("canStreamIncrementalTimeSeries", async () => {
        const timeSeriesName = HEADERS.INCREMENTAL_TIME_SERIES_PREFIX + "heartrate";
        {
            const session = store.openSession();
            await session.store(new User(), "karmel");
            const ts = session.incrementalTimeSeriesFor("karmel", timeSeriesName);
            for (let i = 0; i < 10; i++) {
                ts.increment(addMinutes(baseline, i), i);
            }
            await session.saveChanges();
        }

        const entries = await readAll<TimeSeriesEntry>(
            await store.openSession().incrementalTimeSeriesFor("karmel", timeSeriesName).stream());

        assertThat(entries).hasSize(10);
        for (const [i, entry] of entries.entries()) {
            assertThat(entry.timestamp.getTime()).isEqualTo(addMinutes(baseline, i).getTime());
            assertThat(entry.value).isEqualTo(i);
        }
    });

    it("canStreamTyped", async () => {
        await storeTypedHeartRates("karmel");

        const entries = await readAll<TypedTimeSeriesEntry<HeartRateMeasure>>(
            await store.openSession().timeSeriesFor("karmel", HeartRateMeasure).stream());

        assertThat(entries).hasSize(10);
        for (const [i, entry] of entries.entries()) {
            assertThat(entry.timestamp.getTime()).isEqualTo(addMinutes(baseline, i).getTime());
            assertThat(entry.value instanceof HeartRateMeasure).isTrue();
            assertThat(entry.value.heartRate).isEqualTo(i);
            assertThat(entry.tag).isEqualTo("stream");
        }
    });

    it("canStreamRawQuery", async () => {
        await storeTypedHeartRates("karmel", "karmel2");

        const tsQueryText = "from HeartRateMeasures\n" +
            "group by '5 min'\n" +
            "select last()";

        const session = store.openSession();
        const query = session.advanced.documentQuery(User)
            .selectTimeSeries(b => b.raw(tsQueryText), TimeSeriesAggregationResult);

        const docs = await readAll(await session.advanced.stream(query));

        assertThat(docs).hasSize(2);
        for (const [docIndex, doc] of docs.entries()) {
            const result = doc.document as TimeSeriesAggregationResult;
            assertThat(result instanceof TimeSeriesAggregationResult).isTrue();
            assertThat(result.results).hasSize(2);

            const typed = result.asTypedEntry(HeartRateMeasure);
            for (const [i, entry] of typed.results.entries()) {
                assertThat(entry.last.heartRate).isEqualTo((i * 5 + 4) * (docIndex + 1));
            }
        }
    });

    it("canQueryTimeSeriesUsingDocumentQuery", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Oren", age: 35 }), "users/ayende");
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(addMinutes(baseline, 61), 59, "watches/fitbit");
            tsf.append(addMinutes(baseline, 62), 79, "watches/apple");
            tsf.append(addMinutes(baseline, 63), 69, "watches/fitbit");
            tsf.append(addMonths(addMinutes(baseline, 61), 1), 159, "watches/apple");
            tsf.append(addMonths(addMinutes(baseline, 62), 1), 179, "watches/apple");
            tsf.append(addMonths(addMinutes(baseline, 63), 1), 169, "watches/fitbit");
            await session.saveChanges();
        }

        const tsQueryText = "from Heartrate between $start and $end\n" +
            "where Tag = 'watches/fitbit'\n" +
            "group by '1 month'\n" +
            "select min(), max(), avg()";

        const session = store.openSession();
        const query = session.advanced.documentQuery(User)
            .whereGreaterThan("age", 21)
            .selectTimeSeries(b => b.raw(tsQueryText), TimeSeriesAggregationResult)
            .addParameter("start", baseline)
            .addParameter("end", addMonths(baseline, 3));

        const docs = await readAll(await session.advanced.stream(query));

        assertThat(docs).hasSize(1);
        const results = (docs[0].document as TimeSeriesAggregationResult).results;
        assertThat(results).hasSize(2);

        assertThat(results[0].max[0]).isEqualTo(69);
        assertThat(results[0].min[0]).isEqualTo(59);
        assertThat(results[0].average[0]).isEqualTo(64);

        assertThat(results[1].max[0]).isEqualTo(169);
        assertThat(results[1].min[0]).isEqualTo(169);
        assertThat(results[1].average[0]).isEqualTo(169);
    });
});
