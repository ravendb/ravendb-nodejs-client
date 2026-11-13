import assert from "node:assert";
import { addHours, addMinutes, milliseconds } from "date-fns";
import { IDocumentStore, TimeSeriesAggregationResult } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class Person {
    public name: string;
}

class HeartRate {
    public static readonly TIME_SERIES_VALUES = ["beatsPerMinute"];

    public beatsPerMinute: number;
}

describe("RavenDB_15020", function () {

    const id = "people/1";
    const values = [
        43, 54, 56, 61, 62,
        66, 68, 69, 69, 70,
        71, 72, 77, 78, 79,
        85, 87, 88, 89, 93,
        95, 96, 98, 99, 99
    ];

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeHourlyHeartRates() {
        const baseline = testContext.utcToday();
        const session = store.openSession();
        await session.store(Object.assign(new Person(), { name: "Oren" }), id);

        const timeSeries = session.timeSeriesFor(id, "HeartRate");
        [...values].reverse().forEach((value, i) => timeSeries.append(addHours(baseline, i), value));

        await session.saveChanges();
    }

    function getExpectedPercentile(sorted: number[], percentile: number): number {
        const p = percentile / 100;
        let remainder = 0;
        let rank: number;

        if (p <= 1 / (sorted.length + 1)) {
            rank = 1;
        } else if (p >= sorted.length / (sorted.length + 1)) {
            rank = sorted.length;
        } else {
            const x = p * (sorted.length + 1);
            rank = Math.floor(x);
            remainder = x % 1;
        }

        const first = sorted[rank - 1];
        return remainder ? first + remainder * (sorted[rank] - first) : first;
    }

    function assertAlmostEquals(actual: number, expected: number) {
        assert.ok(Math.abs(actual - expected) < 1e-12, `expected ${expected}, got ${actual}`);
    }

    it("canUsePercentileInTimeSeriesQuery_RawQuery", async () => {
        await storeHourlyHeartRates();

        const session = store.openSession();
        const result = await session.advanced
            .rawQuery(
                "from People select timeseries(from HeartRate select percentile($n))",
                TimeSeriesAggregationResult)
            .addParameter("n", 90)
            .first();

        assert.strictEqual(result.results.length, 1);
        assert.strictEqual(result.results[0].percentile[0], getExpectedPercentile(values, 90));
    });

    it("canUseSlopeInTimeSeriesQuery_Raw", async () => {
        const baseline = testContext.utcToday();

        {
            const session = store.openSession();
            await session.store(Object.assign(new Person(), { name: "Oren" }), id);

            const timeSeries = session.timeSeriesFor(id, "HeartRate");
            const minutesInDay = 24 * 60;
            for (let i = 0; i < minutesInDay; i++) {
                timeSeries.append(addMinutes(baseline, i), i * 100);
            }

            await session.saveChanges();
        }

        const session = store.openSession();
        const result = await session.advanced
            .rawQuery(
                "from People as p select timeseries(from p.HeartRate group by 1 hour select slope())",
                TimeSeriesAggregationResult)
            .first();

        assert.strictEqual(result.results.length, 24);

        const expected = 5900 / milliseconds({ minutes: 60 });
        for (const rangeAggregation of result.results) {
            assert.strictEqual(rangeAggregation.slope[0], expected);
        }
    });

    it("canUseStdDevInTimeSeriesQuery_RawQuery", async () => {
        await storeHourlyHeartRates();

        const session = store.openSession();
        const result = await session.advanced
            .rawQuery(
                "from People select timeseries(from HeartRate select stddev())",
                TimeSeriesAggregationResult)
            .first();

        assert.strictEqual(result.results.length, 1);

        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const squares = values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0);

        assertAlmostEquals(result.results[0].standardDeviation[0], Math.sqrt(squares / (values.length - 1)));
    });

    it("typed aggregation keeps percentile, slope and standard deviation", async () => {
        await storeHourlyHeartRates();

        const session = store.openSession();
        const result = await session.advanced
            .rawQuery(
                "from People select timeseries(from HeartRate select percentile(90), stddev(), max())",
                TimeSeriesAggregationResult)
            .first();

        const untyped = result.results[0];
        const typed = untyped.asTypedEntry(HeartRate);

        assert.strictEqual(typed.max.beatsPerMinute, 99);
        assert.deepStrictEqual(typed.percentile, untyped.percentile);
        assert.deepStrictEqual(typed.standardDeviation, untyped.standardDeviation);
        assert.strictEqual(typed.slope, untyped.slope);
    });
});
