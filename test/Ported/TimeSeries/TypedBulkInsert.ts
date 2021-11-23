import { IDocumentStore, TypedTimeSeriesEntry } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { HeartRateMeasure } from "../FilteredReplicationTest";
import { StockPrice } from "./TimeSeriesTypedSession";

describe("TypedBulkInsert", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateSimpleTimeSeries", async () => {
        const baseLine = testContext.utcToday();

        const documentId = "users/ayende";

        const bulkInsert = store.bulkInsert();

        try {
            const user = new User();
            user.name = "Oren";

            await bulkInsert.store(user, documentId);

            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId, "heartrate");

            try {
                const measure = new TypedTimeSeriesEntry<HeartRateMeasure>();
                measure.timestamp = baseLine.toDate();
                const measure2 = new HeartRateMeasure();
                measure2.heartRate = 59;
                measure.value = measure2;
                measure.tag = "watches/fitbit";

                await timeSeriesBulkInsert.append(measure);
            } finally {
                timeSeriesBulkInsert.dispose();
            }
        } finally {
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const val = (await session.timeSeriesFor(documentId, "heartrate", HeartRateMeasure).get())[0];

            assertThat(val.value.heartRate)
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
        }
    });

    it("canCreateSimpleTimeSeries2", async function () {
        const baseLine = testContext.utcToday();

        const documentId = "users/ayende";

        const bulkInsert = store.bulkInsert();
        try {
            const user = new User();
            user.name = "Oren";

            await bulkInsert.store(user, documentId);

            const measure = new TypedTimeSeriesEntry<HeartRateMeasure>();
            measure.timestamp = baseLine.clone().add(1, "minutes").toDate();
            measure.value = new HeartRateMeasure();
            measure.value.heartRate = 59;
            measure.tag = "watches/fitbit";

            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId, "heartrate");
            try {
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), HeartRateMeasure.create(59), "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), HeartRateMeasure.create(60), "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), HeartRateMeasure.create(61), "watches/fitbit");
            } finally {
                timeSeriesBulkInsert.dispose();
            }
        } finally {
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const val = await session.timeSeriesFor(documentId, "heartrate", HeartRateMeasure).get();

            assertThat(val)
                .hasSize(2);
        }
    });

    it("canCreateTimeSeriesWithoutPassingName", async function () {
        const baseLine = testContext.utcToday();

        const documentId = "users/ayende";

        const bulkInsert = store.bulkInsert();
        try {
            const user = new User();
            user.name = "Oren";

            await bulkInsert.store(user, documentId);

            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(StockPrice, documentId);
            try {
                const measure = new TypedTimeSeriesEntry<StockPrice>();
                measure.timestamp = baseLine.toDate();

                const stockPrice = new StockPrice();
                stockPrice.close = 1;
                stockPrice.open = 2;
                stockPrice.high = 3;
                stockPrice.low = 4;
                stockPrice.volume = 55;
                measure.value = stockPrice;
                measure.tag = "tag";

                await timeSeriesBulkInsert.append(measure);
            } finally {
                timeSeriesBulkInsert.dispose();
            }
        } finally {
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const val = (await session.timeSeriesFor(documentId, StockPrice).get())[0];

            assertThat(val.value.close)
                .isEqualTo(1);
            assertThat(val.value.open)
                .isEqualTo(2);
            assertThat(val.value.high)
                .isEqualTo(3);
            assertThat(val.value.low)
                .isEqualTo(4);
            assertThat(val.value.volume)
                .isEqualTo(55);

            assertThat(val.tag)
                .isEqualTo("tag");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
        }

        {
            const session = store.openSession();
            const doc = await session.load(documentId, User);
            const names = session.advanced.getTimeSeriesFor(doc);

            assertThat(names)
                .hasSize(1);
            assertThat(names[0])
                .isEqualTo("StockPrices");
        }
    });

    it("canDeleteTimestamp", async function () {
        const baseLine = testContext.utcToday();

        const documentId = "users/ayende";

        const bulkInsert = store.bulkInsert();
        try {
            const user = new User();
            user.name = "Oren";

            await bulkInsert.store(user, documentId);

            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId, "heartrate");
            try {
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), HeartRateMeasure.create(59), "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), HeartRateMeasure.create(69), "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), HeartRateMeasure.create(79), "watches/fitbit");
            } finally {
                timeSeriesBulkInsert.dispose();
            }
        } finally {
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, documentId);
            session.timeSeriesFor(documentId, "heartrate")
                .deleteAt(baseLine.clone().add(2, "minutes").toDate());

            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor(documentId, "heartrate").get();

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].values[0])
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].values[0])
                .isEqualTo(79);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }
    });

    it("usingDifferentTags", async function () {
        const baseLine = testContext.utcToday();

        const documentId = "users/ayende";

        const bulkInsert = store.bulkInsert();
        try {
            const user = new User();
            user.name = "Oren";

            await bulkInsert.store(user, documentId);

            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId, "heartrate");
            try {
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), HeartRateMeasure.create(59), "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), HeartRateMeasure.create(70), "watches/apple");
            } finally {
                timeSeriesBulkInsert.dispose();
            }
        } finally {
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor(documentId, "heartrate").get();

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].value)
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].value)
                .isEqualTo(70);
            assertThat(vals[1].tag)
                .isEqualTo("watches/apple");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
        }
    });

    it("canStoreAndReadMultipleTimestamps", async function () {
        const baseLine = testContext.utcToday();

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            try {
                const user = new User();
                user.name = "Oren";

                await bulkInsert.store(user, documentId);

                const ts = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId);
                try {
                    await ts.append(baseLine.clone().add(1, "minutes").toDate(), HeartRateMeasure.create(59), "watches/fitbit");
                } finally {
                    ts.dispose();
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const bulkInsert = store.bulkInsert();
            try {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId);
                try {
                    await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), HeartRateMeasure.create(61), "watches/fitbit");
                    await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), HeartRateMeasure.create(62), "watches/apple-watch");
                } finally {
                    timeSeriesBulkInsert.dispose();
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor(documentId, HeartRateMeasure).get();

            assertThat(vals)
                .hasSize(3);

            assertThat(vals[0].value.heartRate)
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].value.heartRate)
                .isEqualTo(61);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(vals[2].value.heartRate)
                .isEqualTo(62);
            assertThat(vals[2].tag)
                .isEqualTo("watches/apple-watch");
            assertThat(vals[2].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }
    });

    it("canGetTimeSeriesNames", async function () {
        const documentId1 = "users/karmel";
        const documentId2 = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            try {
                await bulkInsert.store(new User(), documentId1);

                const ts = bulkInsert.timeSeriesFor(StockPrice, documentId1, "nasdaq2");
                try {
                    const stockPrice = new StockPrice();
                    stockPrice.open = 7547.31;
                    stockPrice.close = 7123.5;
                    await ts.append(new Date(), stockPrice, "web");
                } finally {
                    ts.dispose();
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const bulkInsert = store.bulkInsert();
            try {
                const ts = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId1, "heartrate2");
                try {
                    const heartRateMeasure = new HeartRateMeasure();
                    heartRateMeasure.heartRate = 76;
                    await ts.append(new Date(), heartRateMeasure, "watches/apple");
                } finally {
                    ts.dispose();
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const bulkInsert = store.bulkInsert();
            try {
                await bulkInsert.store(new User(), documentId2);

                const ts = bulkInsert.timeSeriesFor(StockPrice, documentId2, "nasdaq");
                try {
                    const stockPrice = new StockPrice();
                    stockPrice.open = 7547.31;
                    stockPrice.close = 7123.5;
                    await ts.append(new Date(), stockPrice, "web");
                } finally {
                    ts.dispose();
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const bulkInsert = store.bulkInsert();
            try {
                const ts = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId2, "heartrate");
                try {
                    await ts.append(new Date(), HeartRateMeasure.create(58), "fitbit");
                } finally {
                    ts.dispose();
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const session = store.openSession();
            const user = await session.load(documentId2, User);
            const tsNames = session.advanced.getTimeSeriesFor(user);

            assertThat(tsNames)
                .hasSize(2);

            // should be sorted
            assertThat(tsNames[0])
                .isEqualTo("heartrate");
            assertThat(tsNames[1])
                .isEqualTo("nasdaq");
        }
    });

    it("canStoreAndReadMultipleTimeseriesForDifferentDocuments", async function () {
        const baseLine = testContext.utcToday();

        const documentId1 = "users/ayende";
        const documentId2 = "users/grisha";

        {
            const bulkInsert = store.bulkInsert();
            try {
                const user = new User();
                user.name = "Oren";
                await bulkInsert.store(user, documentId1);

                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId1, "heartrate");
                    try {
                        await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), HeartRateMeasure.create(59), "watches/fitbit");
                    } finally {
                        timeSeriesBulkInsert.dispose();
                    }
                }

                const user2 = new User();
                user2.name = "Grisha";
                await bulkInsert.store(user2, documentId2);

                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId2, "heartrate");
                    try {
                        await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), HeartRateMeasure.create(59), "watches/fitbit");
                    } finally {
                        timeSeriesBulkInsert.dispose();
                    }
                }

            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const bulkInsert = store.bulkInsert();

            try {
                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId1, "heartrate");
                    try {
                        const measure = new TypedTimeSeriesEntry<HeartRateMeasure>();
                        measure.timestamp = baseLine.clone().add(2, "minutes").toDate();
                        measure.tag = "watches/fitbit";
                        measure.value = HeartRateMeasure.create(61);

                        await timeSeriesBulkInsert.append(measure);
                    } finally {
                        timeSeriesBulkInsert.dispose();
                    }
                }

                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId2, "heartrate");
                    try {
                        const measure = new TypedTimeSeriesEntry<HeartRateMeasure>();
                        measure.timestamp = baseLine.clone().add(2, "minutes").toDate();
                        measure.tag = "watches/fitbit";
                        measure.value = HeartRateMeasure.create(61);

                        await timeSeriesBulkInsert.append(measure);
                    } finally {
                        timeSeriesBulkInsert.dispose();
                    }
                }

                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId1, "heartrate");
                    try {
                        const measure = new TypedTimeSeriesEntry<HeartRateMeasure>();
                        measure.timestamp = baseLine.clone().add(3, "minutes").toDate();
                        measure.tag = "watches/apple-watch";
                        measure.value = HeartRateMeasure.create(62);

                        await timeSeriesBulkInsert.append(measure);
                    } finally {
                        timeSeriesBulkInsert.dispose();
                    }
                }

                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId2, "heartrate");
                    try {
                        const measure = new TypedTimeSeriesEntry<HeartRateMeasure>();
                        measure.timestamp = baseLine.clone().add(3, "minutes").toDate();
                        measure.tag = "watches/apple-watch";
                        measure.value = HeartRateMeasure.create(62);

                        await timeSeriesBulkInsert.append(measure);
                    } finally {
                        timeSeriesBulkInsert.dispose();
                    }
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor(documentId1, "heartrate", HeartRateMeasure)
                .get();

            await validateValues(baseLine, vals);

            vals = await session.timeSeriesFor(documentId2, "heartrate", HeartRateMeasure)
                .get();

            await validateValues(baseLine, vals);
        }
    });
});

async function validateValues(baseline: moment.Moment, vals: TypedTimeSeriesEntry<HeartRateMeasure>[]) {
    assertThat(vals)
        .hasSize(3);

    assertThat(vals[0].value.heartRate)
        .isEqualTo(59);
    assertThat(vals[0].tag)
        .isEqualTo("watches/fitbit");
    assertThat(vals[0].timestamp.getTime())
        .isEqualTo(baseline.clone().add(1, "minutes").toDate().getTime());

    assertThat(vals[1].value.heartRate)
        .isEqualTo(61);
    assertThat(vals[1].tag)
        .isEqualTo("watches/fitbit");
    assertThat(vals[1].timestamp.getTime())
        .isEqualTo(baseline.clone().add(2, "minutes").toDate().getTime());

    assertThat(vals[2].value.heartRate)
        .isEqualTo(62);
    assertThat(vals[2].tag)
        .isEqualTo("watches/apple-watch");
    assertThat(vals[2].timestamp.getTime())
        .isEqualTo(baseline.clone().add(3, "minutes").toDate().getTime());
}