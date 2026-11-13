import { Readable } from "node:stream";
import { randomBytes, randomInt } from "node:crypto";
import { GetCountersOperation, IDocumentStore, TypedTimeSeriesEntry } from "../../../src/index.js";
import { readToBuffer } from "../../../src/Utility/StreamUtil.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { HeartRateMeasure } from "../FilteredReplicationTest.js";
import { StockPrice } from "./TimeSeriesTypedSession.js";
import { addMinutes } from "date-fns";

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
                measure.timestamp = baseLine;
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
                .isEqualTo(baseLine.getTime());
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
            measure.timestamp = addMinutes(baseLine, 1);
            measure.value = new HeartRateMeasure();
            measure.value.heartRate = 59;
            measure.tag = "watches/fitbit";

            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, documentId, "heartrate");
            try {
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 1), HeartRateMeasure.create(59), "watches/fitbit");
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 2), HeartRateMeasure.create(60), "watches/fitbit");
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 2), HeartRateMeasure.create(61), "watches/fitbit");
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
                measure.timestamp = baseLine;

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
                .isEqualTo(baseLine.getTime());
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
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 1), HeartRateMeasure.create(59), "watches/fitbit");
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 2), HeartRateMeasure.create(69), "watches/fitbit");
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 3), HeartRateMeasure.create(79), "watches/fitbit");
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
                .deleteAt(addMinutes(baseLine, 2));

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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

            assertThat(vals[1].values[0])
                .isEqualTo(79);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 3).getTime());
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
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 1), HeartRateMeasure.create(59), "watches/fitbit");
                await timeSeriesBulkInsert.append(addMinutes(baseLine, 2), HeartRateMeasure.create(70), "watches/apple");
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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

            assertThat(vals[1].value)
                .isEqualTo(70);
            assertThat(vals[1].tag)
                .isEqualTo("watches/apple");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());
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
                    await ts.append(addMinutes(baseLine, 1), HeartRateMeasure.create(59), "watches/fitbit");
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
                    await timeSeriesBulkInsert.append(addMinutes(baseLine, 2), HeartRateMeasure.create(61), "watches/fitbit");
                    await timeSeriesBulkInsert.append(addMinutes(baseLine, 3), HeartRateMeasure.create(62), "watches/apple-watch");
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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

            assertThat(vals[1].value.heartRate)
                .isEqualTo(61);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());

            assertThat(vals[2].value.heartRate)
                .isEqualTo(62);
            assertThat(vals[2].tag)
                .isEqualTo("watches/apple-watch");
            assertThat(vals[2].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 3).getTime());
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
                        await timeSeriesBulkInsert.append(addMinutes(baseLine, 1), HeartRateMeasure.create(59), "watches/fitbit");
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
                        await timeSeriesBulkInsert.append(addMinutes(baseLine, 1), HeartRateMeasure.create(59), "watches/fitbit");
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
                        measure.timestamp = addMinutes(baseLine, 2);
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
                        measure.timestamp = addMinutes(baseLine, 2);
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
                        measure.timestamp = addMinutes(baseLine, 3);
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
                        measure.timestamp = addMinutes(baseLine, 3);
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

    it("canHaveBulkInsertWithDocumentsAndAttachmentAndCountersAndTypedTimeSeries", async function () {
        const count = 100;
        const size = 64 * 1024;
        const baseline = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
        const attachments = new Map<string, { name: string, bytes: Buffer }>();

        const bulkInsert = store.bulkInsert();
        try {
            for (let i = 0; i < count; i++) {
                const id = "name/" + i;
                await bulkInsert.store(Object.assign(new User(), { name: "Name_" + i }), id);
            }

            for (let i = 0; i < count; i++) {
                const id = "name/" + i;
                const bytes = randomBytes(size);
                const name = id + "_" + randomInt(100);
                attachments.set(id, { name, bytes });

                await bulkInsert.attachmentsFor(id).store(name, Readable.from([bytes]));

                await bulkInsert.countersFor(id).increment(name);

                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(HeartRateMeasure, id, "HeartRate");
                try {
                    await timeSeriesBulkInsert.append(addMinutes(baseline, 1), HeartRateMeasure.create(59), "watches/fitBit");
                } finally {
                    timeSeriesBulkInsert.dispose();
                }
            }
        } finally {
            await bulkInsert.finish();
        }

        for (const [id, { name, bytes }] of attachments) {
            const session = store.openSession();

            const timeSeriesVal = (await session.timeSeriesFor(id, "HeartRate", HeartRateMeasure).get())[0];
            assertThat(timeSeriesVal.value.heartRate).isEqualTo(59);
            assertThat(timeSeriesVal.tag).isEqualTo("watches/fitBit");
            assertThat(timeSeriesVal.timestamp.getTime()).isEqualTo(addMinutes(baseline, 1).getTime());

            const attachment = await session.advanced.attachments.get(id, name);
            attachment.data.resume();
            assertThat((await readToBuffer(attachment.data)).equals(bytes)).isTrue();
            attachment.dispose();

            const counters = await store.operations.send(new GetCountersOperation(id, [name]));
            assertThat(counters.counters[0].totalValue).isEqualTo(1);
        }
    });
});

async function validateValues(baseline: Date, vals: TypedTimeSeriesEntry<HeartRateMeasure>[]) {
    assertThat(vals)
        .hasSize(3);

    assertThat(vals[0].value.heartRate)
        .isEqualTo(59);
    assertThat(vals[0].tag)
        .isEqualTo("watches/fitbit");
    assertThat(vals[0].timestamp.getTime())
        .isEqualTo(addMinutes(baseline, 1).getTime());

    assertThat(vals[1].value.heartRate)
        .isEqualTo(61);
    assertThat(vals[1].tag)
        .isEqualTo("watches/fitbit");
    assertThat(vals[1].timestamp.getTime())
        .isEqualTo(addMinutes(baseline, 2).getTime());

    assertThat(vals[2].value.heartRate)
        .isEqualTo(62);
    assertThat(vals[2].tag)
        .isEqualTo("watches/apple-watch");
    assertThat(vals[2].timestamp.getTime())
        .isEqualTo(addMinutes(baseline, 3).getTime());
}