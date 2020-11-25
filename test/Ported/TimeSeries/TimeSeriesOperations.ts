import {
    GetMultipleTimeSeriesOperation,
    GetTimeSeriesOperation, GetTimeSeriesStatisticsOperation,
    IDocumentStore,
    SessionOptions,
    TimeSeriesBatchOperation,
    TimeSeriesOperation
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { AppendOperation, DeleteOperation } from "../../../src/Documents/Operations/TimeSeries/TimeSeriesOperation";
import moment = require("moment");
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { RawQueryResult } from "./TimeSeriesRawQuery";

describe("TimeSeriesOperations", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateAndGetSimpleTimeSeriesUsingStoreOperations", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        const append1 = new AppendOperation(baseLine.clone().add(1, "second").toDate(), [ 59 ], "watches/fitbit");
        const timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp.append(append1);

        const timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        const timeSeriesRangeResult = await store.operations.send(new GetTimeSeriesOperation(documentId, "Heartrate"));

        assertThat(timeSeriesRangeResult.entries)
            .hasSize(1);

        const value = timeSeriesRangeResult.entries[0];

        assertThat(value.values[0])
            .isEqualTo(59);
        assertThat(value.tag)
            .isEqualTo("watches/fitbit");
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(1, "second").toDate().getTime());
    });

    it("canGetNonExistedRange", async () => {
        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        const timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(1, "second").toDate(), [ 59 ], "watches/fitbit"));

        const timeSeriesBatch = new TimeSeriesBatchOperation("users/ayende", timeSeriesOp);
        await store.operations.send(timeSeriesBatch);

        const timeSeriesRangeResult = await store.operations.send(
            new GetTimeSeriesOperation(
                "users/ayende",
                "Heartrate",
                baseLine.clone().add(-2, "months").toDate(),
                baseLine.clone().add(-1, "months").toDate()
            ));

        assertThat(timeSeriesRangeResult.entries)
            .hasSize(0);
    });

    it("canStoreAndReadMultipleTimestampsUsingStoreOperations", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        const timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp
            .append(new AppendOperation(baseLine.clone().add(1, "second").toDate(), [ 59 ], "watches/fitbit"));
        timeSeriesOp
            .append(new AppendOperation(baseLine.clone().add(2, "second").toDate(), [ 61 ], "watches/fitbit"));
        timeSeriesOp
            .append(new AppendOperation(baseLine.clone().add(5, "second").toDate(), [ 60 ], "watches/apple-watch"));

        const timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        const timeSeriesRangeResult = await store.operations.send(new GetTimeSeriesOperation(documentId, "Heartrate"));

        assertThat(timeSeriesRangeResult.entries)
            .hasSize(3);

        let value = timeSeriesRangeResult.entries[0];

        assertThat(value.values[0])
            .isEqualTo(59);
        assertThat(value.tag)
            .isEqualTo("watches/fitbit");
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(1, "seconds").toDate().getTime());

        value = timeSeriesRangeResult.entries[1];

        assertThat(value.values[0])
            .isEqualTo(61);
        assertThat(value.tag)
            .isEqualTo("watches/fitbit");
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(2, "seconds").toDate().getTime());

        value = timeSeriesRangeResult.entries[2];

        assertThat(value.values[0])
            .isEqualTo(60);
        assertThat(value.tag)
            .isEqualTo("watches/apple-watch");
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(5, "seconds").toDate().getTime());
    });

    it("canDeleteTimestampUsingStoreOperations", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        let timeSeriesOp = new TimeSeriesOperation("Heartrate");

        timeSeriesOp.append(
            new AppendOperation(
                baseLine.clone().add(1, "seconds").toDate(), [ 59 ], "watches/fitbit"));

        timeSeriesOp.append(
            new AppendOperation(
                baseLine.clone().add(2, "seconds").toDate(), [ 61 ], "watches/fitbit"));

        timeSeriesOp.append(
            new AppendOperation(
                baseLine.clone().add(3, "seconds").toDate(), [ 60 ], "watches/fitbit"));

        timeSeriesOp.append(
            new AppendOperation(
                baseLine.clone().add(4, "seconds").toDate(), [ 62.5 ], "watches/fitbit"));

        timeSeriesOp.append(
            new AppendOperation(
                baseLine.clone().add(5, "seconds").toDate(), [ 62 ], "watches/fitbit"));

        let timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        let timeSeriesRangeResult = await store.operations.send(
            new GetTimeSeriesOperation(documentId, "Heartrate", null, null)
        );

        assertThat(timeSeriesRangeResult.entries)
            .hasSize(5);

        timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp.delete(
            new DeleteOperation(
                baseLine.clone().add(2, "seconds").toDate(), baseLine.clone().add(3, "seconds").toDate()));

        timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        timeSeriesRangeResult = await store.operations.send(new GetTimeSeriesOperation(documentId, "Heartrate", null, null));

        assertThat(timeSeriesRangeResult.entries)
            .hasSize(3);

        let value = timeSeriesRangeResult.entries[0];

        assertThat(value.values[0])
            .isEqualTo(59);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(1, "second").toDate().getTime());

        value = timeSeriesRangeResult.entries[1];

        assertThat(value.values[0])
            .isEqualTo(62.5);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(4, "seconds").toDate().getTime());

        value = timeSeriesRangeResult.entries[2];

        assertThat(value.values[0])
            .isEqualTo(62);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(5, "second").toDate().getTime());

        {
            const session = store.openSession();
            await session.delete(documentId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, documentId);
            await session.saveChanges();

            const tsf = session.timeSeriesFor(documentId, "Heartrate");
            tsf.append(baseLine.clone().add(1, "minutes").toDate(), [ 59 ], "watches/fitbit");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), [ 69 ], "watches/fitbit");
            tsf.append(baseLine.clone().add(3, "minutes").toDate(), [ 79 ], "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, documentId);
            session.timeSeriesFor(documentId, "Heartrate")
                .deleteAt(baseLine.clone().add(2, "minutes").toDate());
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor(documentId, "Heartrate").get();

            assertThat(vals)
                .hasSize(2);

            assertThat(vals[0].values)
                .hasSize(1);
            assertThat(vals[0].value)
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minute").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(1);
            assertThat(vals[1].value)
                .isEqualTo(79);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }
    });

    it("canDeleteLargeRange", async () => {
        const baseLine = moment().startOf("day").add(-1, "second");

        {
            const session = store.openSession();
            await session.store(new User(), "foo/bar");
            const tsf = await session.timeSeriesFor("foo/bar", "BloodPressure");

            for (let j = 1; j < 10_000; j++) {
                const offset = j * 10;
                const time = baseLine.clone().add(offset, "seconds").toDate();

                tsf.append(time, [ j ], "watches/apple");
            }

            await session.saveChanges();
        }

        const rawQuery = "declare timeseries blood_pressure(doc)\n" +
            "  {\n" +
            "      from doc.BloodPressure between $start and $end\n" +
            "      group by 1h\n" +
            "      select min(), max(), avg(), first(), last()\n" +
            "  }\n" +
            "  from Users as p\n" +
            "  select blood_pressure(p) as bloodPressure";
        
        {
            const session = store.openSession();
            const query = session.advanced.rawQuery(rawQuery, RawQueryResult)
                .addParameter("start", baseLine.toDate())
                .addParameter("end", baseLine.clone().add(1, "day").toDate());

            const result = await query.all();

            assertThat(result)
                .hasSize(1);

            const agg = result[0];

            const bloodPressure = agg.bloodPressure;
            const count = bloodPressure.results.map(x => x.count[0]).reduce((a, b) => a + b, 0);
            assertThat(count)
                .isEqualTo(8640);
            assertThat(count)
                .isEqualTo(bloodPressure.count);
            assertThat(bloodPressure.results.length)
                .isEqualTo(24);

            for (let index = 0; index < bloodPressure.results.length; index++) {
                const item = bloodPressure.results[index];

                assertThat(item.count[0])
                    .isEqualTo(360);
                assertThat(item.average[0])
                    .isEqualTo(index * 360 + 180 + 0.5);
                assertThat(item.max[0])
                    .isEqualTo((index + 1) * 360);
                assertThat(item.min[0])
                    .isEqualTo(index * 360 + 1);
                assertThat(item.first[0])
                    .isEqualTo(index * 360 + 1);
                assertThat(item.last[0])
                    .isEqualTo((index + 1) * 360);
            }

            {
                const session = store.openSession();
                const tsf = session.timeSeriesFor("foo/bar", "BloodPressure");
                tsf.delete(baseLine.clone().add(3600, "seconds").toDate(), baseLine.clone().add(3600 * 10, "seconds").toDate()); // remove 9 hours
                await session.saveChanges();
            }

            const sessionOptions: SessionOptions = {
                noCaching: true
            };

            {
                const session = store.openSession(sessionOptions);
                const query = session.advanced.rawQuery(rawQuery, RawQueryResult)
                    .addParameter("start", baseLine.toDate())
                    .addParameter("end", baseLine.clone().add(1, "day").toDate());

                const result = await query.all();

                const agg = result[0];

                const bloodPressure = agg.bloodPressure;
                const count = bloodPressure.results.map(x => x.count[0]).reduce((a, b) => a + b, 0);
                assertThat(count)
                    .isEqualTo(5399);
                assertThat(count)
                    .isEqualTo(bloodPressure.count);
                assertThat(bloodPressure.results.length)
                    .isEqualTo(15);

                let index = 0;

                let item = bloodPressure.results[index];
                assertThat(item.count[0])
                    .isEqualTo(359);
                assertThat(item.average[0])
                    .isEqualTo(180);
                assertThat(item.max[0])
                    .isEqualTo(359);
                assertThat(item.min[0])
                    .isEqualTo(1);
                assertThat(item.first[0])
                    .isEqualTo(1);
                assertThat(item.last[0])
                    .isEqualTo(359);

                for (index = 1; index < bloodPressure.results.length; index++) {
                    item = bloodPressure.results[index];
                    const realIndex = index + 9;

                    assertThat(item.count[0])
                        .isEqualTo(360);
                    assertThat(item.average[0])
                        .isEqualTo(realIndex * 360 + 180 + 0.5);
                    assertThat(item.max[0])
                        .isEqualTo((realIndex + 1) * 360);
                    assertThat(item.min[0])
                        .isEqualTo(realIndex * 360 + 1);
                    assertThat(item.first[0])
                        .isEqualTo(realIndex * 360 + 1);
                    assertThat(item.last[0])
                        .isEqualTo((realIndex + 1) * 360);
                }
            }
        }
    });

    it("canAppendAndRemoveTimestampsInSingleBatch", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        let timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(1, "seconds").toDate(), [ 59 ], "watches/fitbit"));
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(2, "seconds").toDate(), [ 61 ], "watches/fitbit"));
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(3, "seconds").toDate(), [ 61.5 ], "watches/fitbit"));

        let timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        let timeSeriesRangeResult = await store.operations.send(new GetTimeSeriesOperation(documentId, "Heartrate", null, null));
        assertThat(timeSeriesRangeResult.entries)
            .hasSize(3);

        timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(4, "seconds").toDate(), [ 60 ], "watches/fitbit"));
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(5, "seconds").toDate(), [ 62.5 ], "watches/fitbit"));
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(6, "seconds").toDate(), [ 62 ], "watches/fitbit"));

        timeSeriesOp.delete(new DeleteOperation(baseLine.clone().add(2, "seconds").toDate(), baseLine.clone().add(3, "seconds").toDate()));

        timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        timeSeriesRangeResult = await store.operations.send(new GetTimeSeriesOperation(documentId, "Heartrate", null, null));

        assertThat(timeSeriesRangeResult.entries)
            .hasSize(4);

        let value = timeSeriesRangeResult.entries[0];
        assertThat(value.values[0])
            .isEqualTo(59);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(1, "seconds").toDate().getTime());

        value = timeSeriesRangeResult.entries[1];
        assertThat(value.values[0])
            .isEqualTo(60);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(4, "seconds").toDate().getTime());

        value = timeSeriesRangeResult.entries[2];
        assertThat(value.values[0])
            .isEqualTo(62.5);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(5, "seconds").toDate().getTime());

        value = timeSeriesRangeResult.entries[3];
        assertThat(value.values[0])
            .isEqualTo(62);
        assertThat(value.timestamp.getTime())
            .isEqualTo(baseLine.clone().add(6, "seconds").toDate().getTime());
    });

    it("shouldThrowOnAttemptToCreateTimeSeriesOnMissingDocument", async () => {
        const baseLine = moment().startOf("day");

        const timeSeriesOp = new TimeSeriesOperation("Heartrate");
        timeSeriesOp.append(new AppendOperation(baseLine.clone().add(1, "seconds").toDate(), [ 59 ], "watches/fitbit"));

        const timeSeriesBatch = new TimeSeriesBatchOperation("users/ayende", timeSeriesOp);
        await assertThrows(async () => {
            return store.operations.send(timeSeriesBatch)
        }, err => {
            assertThat(err.name)
                .isEqualTo("DocumentDoesNotExistException");
            assertThat(err.message)
                .contains("Cannot operate on time series of a missing document");
        });
    });

    it("canGetMultipleRangesInSingleRequest", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        const timeSeriesOp = new TimeSeriesOperation("Heartrate");

        for (let i = 0; i <= 360; i++) {
            timeSeriesOp.append(new AppendOperation(baseLine.clone().add(i * 10, "seconds").toDate(), [ 59 ], "watches/fitbit"));
        }

        const timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);
        await store.operations.send(timeSeriesBatch);

        const timeSeriesDetails = await store.operations.send(new GetMultipleTimeSeriesOperation(documentId, [
            {
                name: "Heartrate",
                from: baseLine.clone().add(5, "minutes").toDate(),
                to: baseLine.clone().add(10, "minutes").toDate()
            },
            {
                name: "Heartrate",
                from: baseLine.clone().add(15, "minutes").toDate(),
                to: baseLine.clone().add(30, "minutes").toDate()
            },
            {
                name: "Heartrate",
                from: baseLine.clone().add(40, "minutes").toDate(),
                to: baseLine.clone().add(60, "minutes").toDate()
            }
        ]));

        assertThat(timeSeriesDetails.id)
            .isEqualTo(documentId);
        assertThat(timeSeriesDetails.values)
            .hasSize(1);
        assertThat(timeSeriesDetails.values.get("Heartrate"))
            .hasSize(3);

        let range = timeSeriesDetails.values.get("Heartrate")[0];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(31);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
        assertThat(range.entries[30].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

        range = timeSeriesDetails.values.get("Heartrate")[1];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(91);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());
        assertThat(range.entries[90].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

        range = timeSeriesDetails.values.get("Heartrate")[2];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(60, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(121);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
        assertThat(range.entries[120].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(60, "minutes").toDate().getTime());
    });

    it("canGetMultipleTimeSeriesInSingleRequest", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        // append

        const baseLine = moment().startOf("day");

        let timeSeriesOp = new TimeSeriesOperation("Heartrate");

        for (let i = 0; i <= 10; i++) {
            timeSeriesOp.append(new AppendOperation(baseLine.clone().add(i * 10, "minutes").toDate(), [ 72 ], "watches/fitbit"));
        }

        let timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        timeSeriesOp = new TimeSeriesOperation("BloodPressure");

        for (let i = 0; i <= 10; i++) {
            timeSeriesOp.append(new AppendOperation(baseLine.clone().add(i * 10, "minutes").toDate(), [ 80 ]));
        }

        timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        timeSeriesOp = new TimeSeriesOperation("Temperature");

        for (let i = 0; i <= 10; i++) {
            timeSeriesOp.append(new AppendOperation(baseLine.clone().add(i * 10, "minutes").toDate(), [ 37 + i * 0.15 ]));
        }

        timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        // get ranges from multiple time series in a single request

        const timeSeriesDetails = await store.operations.send(new GetMultipleTimeSeriesOperation(documentId, [
            {
                name: "Heartrate",
                from: baseLine.toDate(),
                to: baseLine.clone().add(15, "minutes").toDate()
            }, {
                name: "Heartrate",
                from: baseLine.clone().add(30, "minutes").toDate(),
                to: baseLine.clone().add(45, "minutes").toDate()
            }, {
                name: "BloodPressure",
                from: baseLine.toDate(),
                to: baseLine.clone().add(30, "minutes").toDate()
            }, {
                name: "BloodPressure",
                from: baseLine.clone().add(60, "minutes").toDate(),
                to: baseLine.clone().add(90, "minutes").toDate()
            }, {
                name: "Temperature",
                from: baseLine.toDate(),
                to: baseLine.clone().add(1, "day").toDate()
            }
        ]));

        assertThat(timeSeriesDetails.id)
            .isEqualTo("users/ayende");

        assertThat(timeSeriesDetails.values)
            .hasSize(3);

        assertThat(timeSeriesDetails.values.get("Heartrate"))
            .hasSize(2);

        let range = timeSeriesDetails.values.get("Heartrate")[0];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(2);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(range.entries[1].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

        assertThat(range.totalResults)
            .isNull();

        range = timeSeriesDetails.values.get("Heartrate")[1];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(45, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(2);
        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());
        assertThat(range.entries[1].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());

        assertThat(range.totalResults)
            .isNull();

        assertThat(timeSeriesDetails.values.get("BloodPressure"))
            .hasSize(2);

        range = timeSeriesDetails.values.get("BloodPressure")[0];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(4);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(range.entries[3].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

        assertThat(range.totalResults)
            .isNull();

        range = timeSeriesDetails.values.get("BloodPressure")[1];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.clone().add(60, "minutes").toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(90, "minutes").toDate().getTime());

        assertThat(range.entries)
            .hasSize(4);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(60, "minutes").toDate().getTime());
        assertThat(range.entries[3].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(90, "minutes").toDate().getTime());

        assertThat(range.totalResults)
            .isNull();

        assertThat(timeSeriesDetails.values.get("Temperature"))
            .hasSize(1);

        range = timeSeriesDetails.values.get("Temperature")[0];

        assertThat(range.from.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(range.to.getTime())
            .isEqualTo(baseLine.clone().add(1, "day").toDate().getTime());

        assertThat(range.entries)
            .hasSize(11);

        assertThat(range.entries[0].timestamp.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(range.entries[10].timestamp.getTime())
            .isEqualTo(baseLine.clone().add(100, "minutes").toDate().getTime());

        assertThat(range.totalResults)
            .isEqualTo(11); // full range
    });

    it("shouldThrowOnNullOrEmptyRanges", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        const timeSeriesOp = new TimeSeriesOperation("Heartrate");

        for (let i = 0; i <= 10; i++) {
            timeSeriesOp.append(
                new AppendOperation(
                    baseLine.clone().add(i * 10, "minutes").toDate(), [ 72 ], "watches/fitbit"));
        }

        const timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        await assertThrows(() => store.operations.send(new GetTimeSeriesOperation("users/ayende", null)), err => {
            assertThat(err.name)
                .isEqualTo("InvalidArgumentException");
        });

        await assertThrows(() => store.operations.send(new GetMultipleTimeSeriesOperation("users/ayende", [])), err => {
            assertThat(err.name)
                .isEqualTo("InvalidArgumentException");
        });
    });

    it("getMultipleTimeSeriesShouldThrowOnMissingNameFromRange", async () => {
        {
            const documentId = "users/ayende";

            {
                const session = store.openSession();
                await session.store(new User(), documentId);
                await session.saveChanges();
            }

            const baseLine = moment().startOf("day");

            const timeSeriesOp = new TimeSeriesOperation("Heartrate");

            for (let i = 0; i <= 10; i++) {
                timeSeriesOp.append(
                    new AppendOperation(baseLine.clone().add(i * 10, "minutes").toDate(), [ 72 ], "watches/fitbit"));
            }

            const timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

            await store.operations.send(timeSeriesBatch);

            await assertThrows(() => {
                return store.operations.send(new GetMultipleTimeSeriesOperation("users/ayende", [{
                    name: null,
                    from: baseLine.toDate(),
                    to: null
                }]))
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .contains("Name cannot be null or empty");
            })
        }
    });

    it("getTimeSeriesShouldThrowOnMissingName", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const baseLine = moment().startOf("day");

        const timeSeriesOp = new TimeSeriesOperation("Heartrate");

        for (let i = 0; i <= 10; i++) {
            timeSeriesOp.append(
                new AppendOperation(
                    baseLine.add(i * 10, "minutes").toDate(), [ 72 ], "watches/fitbit"));
        }

        const timeSeriesBatch = new TimeSeriesBatchOperation(documentId, timeSeriesOp);

        await store.operations.send(timeSeriesBatch);

        await assertThrows(
            () => store.operations.send(
                new GetTimeSeriesOperation(
                    "users/ayende",
                    "",
                    baseLine.toDate(),
                    baseLine.clone().add(10, "years").toDate()))
        , err => {
                assertThat(err.message)
                    .contains("Timeseries cannot be null or empty");
            });
    });

    it("getTimeSeriesStatistics", async () => {
        const documentId = "users/ayende";

        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, documentId);

            let ts = session.timeSeriesFor(documentId, "heartrate");
            for (let i = 0; i <= 10; i++) {
                ts.append(baseLine.clone().add(i * 10, "minutes").toDate(), 72, "watches/fitbit");
            }

            ts = session.timeSeriesFor(documentId, "pressure");
            for (let i = 10; i <= 20; i++) {
                ts.append(baseLine.clone().add(i * 10, "minutes").toDate(), 72, "watches/fitbit");
            }

            await session.saveChanges();
        }

        const op = await store.operations.send(new GetTimeSeriesStatisticsOperation(documentId));

        assertThat(op.documentId)
            .isEqualTo(documentId);
        assertThat(op.timeSeries)
            .hasSize(2);

        const ts1 = op.timeSeries[0];
        const ts2 = op.timeSeries[1];

        assertThat(ts1.name)
            .isEqualTo("heartrate");
        assertThat(ts2.name)
            .isEqualTo("pressure");

        assertThat(ts1.numberOfEntries)
            .isEqualTo(11);
        assertThat(ts2.numberOfEntries)
            .isEqualTo(11);

        assertThat(ts1.startDate.getTime())
            .isEqualTo(baseLine.toDate().getTime());
        assertThat(ts1.endDate.getTime())
            .isEqualTo(baseLine.clone().add(10 * 10, "minutes").toDate().getTime());

        assertThat(ts2.startDate.getTime())
            .isEqualTo(baseLine.clone().add(10 * 10, "minutes").toDate().getTime());
        assertThat(ts2.endDate.getTime())
            .isEqualTo(baseLine.clone().add(20 * 10, "minutes").toDate().getTime());
    });

    it("canDeleteWithoutProvidingFromAndToDates", async () => {
        const baseLine = moment().startOf("day");

        const docId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), docId);

            const tsf = session.timeSeriesFor(docId, "HeartRate");
            const tsf2 = session.timeSeriesFor(docId, "BloodPressure");
            const tsf3 = session.timeSeriesFor(docId, "BodyTemperature");

            for (let j = 0; j < 100; j++) {
                tsf.append(baseLine.clone().add(j, "minutes").toDate(), j);
                tsf2.append(baseLine.clone().add(j, "minutes").toDate(), j);
                tsf3.append(baseLine.clone().add(j, "minutes").toDate(), j);
            }

            await session.saveChanges();
        }

        let get = await store.operations.send(new GetTimeSeriesOperation(docId, "HeartRAte"));

        assertThat(get.entries)
            .hasSize(100);

        // null From, To

        let deleteOp = new TimeSeriesOperation();
        deleteOp.name = "Heartrate";
        deleteOp.delete(new DeleteOperation());

        await store.operations.send(new TimeSeriesBatchOperation(docId, deleteOp));

        get = await store.operations.send(new GetTimeSeriesOperation(docId, "HeartRate"));
        assertThat(get)
            .isNull();

        get = await store.operations.send(new GetTimeSeriesOperation(docId, "BloodPressure"));
        assertThat(get.entries)
            .hasSize(100);

        // null to

        deleteOp = new TimeSeriesOperation();
        deleteOp.name = "BloodPressure";
        deleteOp.delete(new DeleteOperation(baseLine.clone().add(50, "minutes").toDate(), null));

        await store.operations.send(new TimeSeriesBatchOperation(docId, deleteOp));

        get = await store.operations.send(new GetTimeSeriesOperation(docId, "BloodPressure"));

        assertThat(get.entries)
            .hasSize(50);

        get = await store.operations.send(new GetTimeSeriesOperation(docId, "BodyTemperature"));
        assertThat(get.entries)
            .hasSize(100);

        // null from
        deleteOp = new TimeSeriesOperation();
        deleteOp.name = "BodyTemperature";
        deleteOp.delete(new DeleteOperation(null, baseLine.clone().add(19, "minutes").toDate()));

        await store.operations.send(new TimeSeriesBatchOperation(docId, deleteOp));

        get = await store.operations.send(new GetTimeSeriesOperation(docId, "BodyTemperature"));
        assertThat(get.entries)
            .hasSize(80);
    });
});
