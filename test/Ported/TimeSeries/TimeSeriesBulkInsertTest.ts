import { GetCountersOperation, IDocumentStore, TimeSeriesEntry } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { IAttachmentsBulkInsert } from "../../../src/Documents/BulkInsertOperation";
import { readToBuffer } from "../../../src/Utility/StreamUtil";

describe("TimeSeriesBulkInsertTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateSimpleTimeSeries", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();

            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minute").toDate(), 59, "watches/fitbit");

                timeSeriesBulkInsert.dispose();
            }
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();

            const val = (await session.timeSeriesFor(documentId, "Heartrate").get())[0];

            assertThat(val.values)
                .hasSize(1);
            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minute").toDate().getTime());
        }
    });

    it("canCreateSimpleTimeSeries2", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 60, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 61, "watches/fitbit");

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const val = await session.timeSeriesFor(documentId, "Heartrate")
                .get();

            assertThat(val)
                .hasSize(2);
        }
    });

    it("canDeleteTimestamp", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();

            const user = new User();
            user.name = "Oren";

            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 69, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), 79, "watches/fitbit");

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
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
            assertThat(vals[0].values[0])
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(1);
            assertThat(vals[1].values[0])
                .isEqualTo(79);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());

        }
    });

    it("usingDifferentTags", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 70, "watches/apple");

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get();

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].values)
                .hasSize(1);
            assertThat(vals[0].values[0])
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minute").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(1);
            assertThat(vals[1].values[0])
                .isEqualTo(70);
            assertThat(vals[1].tag)
                .isEqualTo("watches/apple");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minute").toDate().getTime());
        }
    });

    it("usingDifferentNumberOfValues_SmallToLarge", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), [ 70, 120, 80 ], "watches/apple");
                await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), 69, "watches/fitbit");

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get();

            assertThat(vals)
                .hasSize(3);
            assertThat(vals[0].values)
                .hasSize(1);
            assertThat(vals[0].values[0])
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(3);
            assertThat(vals[1].values[0])
                .isEqualTo(70);
            assertThat(vals[1].values[1])
                .isEqualTo(120);
            assertThat(vals[1].values[2])
                .isEqualTo(80);
            assertThat(vals[1].tag)
                .isEqualTo("watches/apple");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(vals[2].values)
                .hasSize(1);
            assertThat(vals[2].values[0])
                .isEqualTo(69);
            assertThat(vals[2].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[2].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }
    });

    it("usingDifferentNumberOfValues_LargeToSmall", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert()

            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), [ 70, 120, 80 ], "watches/apple");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 59, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), 69, "watches/fitbit");

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate").get();

            assertThat(vals)
                .hasSize(3);

            assertThat(vals[0].values)
                .hasSize(3);
            assertThat(vals[0].values[0])
                .isEqualTo(70);
            assertThat(vals[0].values[1])
                .isEqualTo(120);
            assertThat(vals[0].values[2])
                .isEqualTo(80);
            assertThat(vals[0].tag)
                .isEqualTo("watches/apple");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(1);
            assertThat(vals[1].values[0])
                .isEqualTo(59);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(vals[2].values)
                .hasSize(1);
            assertThat(vals[2].values[0])
                .isEqualTo(69);
            assertThat(vals[2].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[2].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }
    });

    it("canStoreAndReadMultipleTimestamps", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
            await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 61, "watches/fitbit");
            await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), 62, "watches/apple-watch");
            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate").get();

            assertThat(vals)
                .hasSize(3);

            assertThat(vals[0].values)
                .hasSize(1);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(1);
            assertThat(vals[1].values[0])
                .isEqualTo(61);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(vals[2].values)
                .hasSize(1);
            assertThat(vals[2].values[0])
                .isEqualTo(62);
            assertThat(vals[2].tag)
                .isEqualTo("watches/apple-watch");
            assertThat(vals[2].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }
    });

    it("canStoreLargeNumberOfValues", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, documentId);
            await session.saveChanges();
        }

        let offset = 0;

        for (let i = 0; i < 10; i++) {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

            for (let j = 0; j < 1000; j++) {
                await timeSeriesBulkInsert.append(baseLine.clone().add(offset++, "minutes").toDate(), offset, "watches/fitbit");
            }

            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate").get();

            assertThat(vals)
                .hasSize(10_000);

            for (let i = 0; i < 10_000; i++) {
                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(i, "minutes").toDate().getTime());
                assertThat(vals[i].values[0])
                    .isEqualTo(1 + i);
            }
        }
    });

    it("canStoreValuesOutOfOrder", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, documentId);
            await session.saveChanges();
        }

        const retries = 1000;

        let offset = 0;

        {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
            for (let j = 0; j < retries; j++) {
                await timeSeriesBulkInsert.append(baseLine.clone().add(offset, "minutes").toDate(), offset, "watches/fitbit");

                offset += 5;
            }

            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        offset = 1;

        {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
            for (let j = 0; j < retries; j++) {
                await timeSeriesBulkInsert.append(baseLine.clone().add(offset, "minutes").toDate(), offset, "watches/fitbit");

                offset += 5;
            }

            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get();

            assertThat(vals)
                .hasSize(2 * retries);

            offset = 0;

            for (let i = 0; i < retries; i++) {
                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(offset, "minutes").toDate().getTime());
                assertThat(vals[i].values[0])
                    .isEqualTo(offset);

                offset++;
                i++;

                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(offset, "minutes").toDate().getTime());
                assertThat(vals[i].values[0])
                    .isEqualTo(offset);

                offset += 4;
            }
        }
    });

    it("canRequestNonExistingTimeSeriesRange", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                await timeSeriesBulkInsert.append(baseLine.toDate(), 58, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(10, "minutes").toDate(), 60, "watches/fitbit");

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(-10, "minutes").toDate(), baseLine.clone().add(-5, "minutes").toDate());

            assertThat(vals)
                .hasSize(0);

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(5, "minutes").toDate(), baseLine.clone().add(9, "minutes").toDate());

            assertThat(vals)
                .hasSize(0);
        }
    });

    it("canGetTimeSeriesNames", async () => {
        const baseLine = moment().startOf("day");
        const documentId1 = "users/karmel";
        const documentId2 = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            await bulkInsert.store(user, documentId1);
            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId1, "Nasdaq2");
                await timeSeriesBulkInsert.append(new Date(), 7547.31, "web");
                timeSeriesBulkInsert.dispose();
            }
            await bulkInsert.finish();
        }

        {
            const bulkInsert = store.bulkInsert();
            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId1, "Heartrate2");
                await timeSeriesBulkInsert.append(new Date(), 7547.31, "web");
                timeSeriesBulkInsert.dispose();
            }
            await bulkInsert.finish();
        }

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            await bulkInsert.store(user, documentId2);
            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId2, "Nasdaq");
                await timeSeriesBulkInsert.append(new Date(), 7547.31, "web");
                timeSeriesBulkInsert.dispose();
            }
            await bulkInsert.finish();
        }

        {
            const bulkInsert = store.bulkInsert();
            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId2, "Heartrate");
                await timeSeriesBulkInsert.append(new Date(), 58, "fitbit");
                timeSeriesBulkInsert.dispose();
            }
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>(documentId2, User);
            const tsNames = session.advanced.getTimeSeriesFor(user);
            assertThat(tsNames)
                .hasSize(2);

            // should be sorted
            assertThat(tsNames[0])
                .isEqualTo("Heartrate");
            assertThat(tsNames[1])
                .isEqualTo("Nasdaq");
        }

        {
            const session = store.openSession();
            const user = await session.load<User>(documentId1, User);
            const tsNames = session.advanced.getTimeSeriesFor(user);
            assertThat(tsNames)
                .hasSize(2);

            // should be sorted
            assertThat(tsNames[0])
                .isEqualTo("Heartrate2");
            assertThat(tsNames[1])
                .isEqualTo("Nasdaq2");
        }

        {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId2, "heartrate");
            await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 58, "fitbit");
            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", User);
            const tsNames = session.advanced.getTimeSeriesFor(user);
            assertThat(tsNames)
                .hasSize(2);

            // should preserve original casing
            assertThat(tsNames[0])
                .isEqualTo("Heartrate");
            assertThat(tsNames[1])
                .isEqualTo("Nasdaq");
        }
    });

    it("canGetTimeSeriesNames2", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        let offset = 0;

        for (let i = 0; i < 100; i++) {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

            for (let j = 0; j < 1000; j++) {
                await timeSeriesBulkInsert.append(baseLine.clone().add(offset++, "minutes").toDate(), offset, "watches/fitbit");
            }

            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        offset = 0;

        for (let i = 0; i < 100; i++) {
            const bulkInsert = store.bulkInsert();
            const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Pulse");

            for (let j = 0; j < 1000; j++) {
                await timeSeriesBulkInsert.append(baseLine.clone().add(offset++, "minutes").toDate(), offset, "watches/fitbit");
            }

            timeSeriesBulkInsert.dispose();
            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get();

            assertThat(vals)
                .hasSize(100_000);

            for (let i = 0; i < 100_000; i++) {
                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(i, "minutes").toDate().getTime());
                assertThat(vals[i].values[0])
                    .isEqualTo(1 + i);
            }
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Pulse")
                .get();
            assertThat(vals)
                .hasSize(100_000);

            for (let i = 0; i < 100_000; i++) {
                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(i, "minutes").toDate().getTime());
                assertThat(vals[i].value)
                    .isEqualTo(1 + i);
            }
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", User);
            const tsNames = session.advanced.getTimeSeriesFor(user);

            // should be sorted
            assertThat(tsNames[0])
                .isEqualTo("Heartrate");
            assertThat(tsNames[1])
                .isEqualTo("Pulse");
        }
    });

    it("shouldDeleteTimeSeriesUponDocumentDeletion", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 59, "watches/fitbit");
                timeSeriesBulkInsert.dispose();
            }

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate2");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/apple");
                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            await session.delete(documentId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor(documentId, "Heartrate")
                .get();

            assertThat(vals)
                .isNull();

            vals = await session.timeSeriesFor(documentId, "Heartrate2")
                .get();
            assertThat(vals)
                .isNull();
        }
    });

    it("canSkipAndTakeTimeSeries", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const bulkInsert = store.bulkInsert();

            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");
                for (let i = 0; i < 100; i++) {
                    await timeSeriesBulkInsert.append(baseLine.clone().add(i, "minutes").toDate(), 100 + i, "watches/fitbit");
                }
                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(5, 20);

            assertThat(vals)
                .hasSize(20);

            for (let i = 0; i < vals.length; i++) {
                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(5 + i, "minutes").toDate().getTime());
                assertThat(vals[i].value)
                    .isEqualTo(105 + i);
            }
        }
    });

    it("canStoreAndReadMultipleTimeseriesForDifferentDocuments", async () => {
        const baseLine = moment().startOf("day");

        const documentId1 = "users/ayende";
        const documentId2 = "users/grisha";

        {
            const bulkInsert = store.bulkInsert();
            const user1 = new User();
            user1.name = "Oren";
            await bulkInsert.store(user1, documentId1);
            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId1, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minute").toDate(), 59, "watches/fitbit");
                timeSeriesBulkInsert.dispose();
            }

            const user2 = new User();
            user2.name = "Grisha";
            await bulkInsert.store(user2, documentId2);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId2, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minute").toDate(), 59, "watches/fitbit");
                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const bulkInsert = store.bulkInsert();

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId1, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 61, "watches/fitbit");
                timeSeriesBulkInsert.dispose();
            }

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId2, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(2, "minutes").toDate(), 61, "watches/fitbit");
                timeSeriesBulkInsert.dispose();
            }

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId1, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), 62, "watches/apple-watch");
                timeSeriesBulkInsert.dispose();
            }

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId2, "Heartrate");
                await timeSeriesBulkInsert.append(baseLine.clone().add(3, "minutes").toDate(), 62, "watches/apple-watch");
                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        const validateValues  = (vals: TimeSeriesEntry[]) => {
            assertThat(vals)
                .hasSize(3);

            assertThat(vals[0].values)
                .hasSize(1);
            assertThat(vals[0].values[0])
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(vals[1].values)
                .hasSize(1);
            assertThat(vals[1].values[0])
                .isEqualTo(61);
            assertThat(vals[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(vals[2].values)
                .hasSize(1);
            assertThat(vals[2].values[0])
                .isEqualTo(62);
            assertThat(vals[2].tag)
                .isEqualTo("watches/apple-watch");
            assertThat(vals[2].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor(documentId1, "Heartrate").get();
            validateValues(vals);

            vals = await session.timeSeriesFor(documentId2, "Heartrate").get();
            validateValues(vals);
        }
    });

    it("canAppendALotOfTimeSeries", async () => {
        const numberOfTimeSeries = 10 * 1024;

        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        let offset = 0;

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                for (let j = 0; j < numberOfTimeSeries; j++) {
                    await timeSeriesBulkInsert.append(baseLine.clone().add(offset++, "minutes").toDate(), offset, "watches/fitbit");
                }

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor(documentId, "Heartrate").get();

            assertThat(vals)
                .hasSize(numberOfTimeSeries);

            for (let i = 0; i < numberOfTimeSeries; i++) {
                assertThat(vals[i].timestamp.getTime())
                    .isEqualTo(baseLine.clone().add(i, "minutes").toDate().getTime());
                assertThat(vals[i].values)
                    .hasSize(1);
                assertThat(vals[i].values[0])
                    .isEqualTo(1 + i);
            }
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", User);
            const tsNames = session.advanced.getTimeSeriesFor(user);
            assertThat(tsNames)
                .hasSize(1);
            assertThat(tsNames[0])
                .isEqualTo("Heartrate");
        }
    });

    it("errorHandling", async () => {
        const baseLine = moment().startOf("day");
        const documentId = "users/ayende";

        {
            const bulkInsert = await store.bulkInsert();

            const user = new User();
            user.name = "Oren";
            await bulkInsert.store(user, documentId);

            {
                const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(documentId, "Heartrate");

                timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");

                const errorMessage = "There is an already running time series operation, did you forget to close it?";

                await assertThrows(async () => {
                    const user1 = new User();
                    user1.name = "Oren";
                    await bulkInsert.store(user1);
                }, err => {
                    assertThat(err.message)
                        .contains(errorMessage);
                    assertThat(err.name)
                        .isEqualTo("InvalidOperationException");
                });

                await assertThrows(() => {
                    return bulkInsert.countersFor("test").increment("1", 1)
                }, err => {
                    assertThat(err.message)
                        .contains(errorMessage);
                    assertThat(err.name)
                        .isEqualTo("InvalidOperationException");
                });

                await assertThrows(() => {
                    return bulkInsert.timeSeriesFor(documentId, "Pulse");
                }, err => {
                    assertThat(err.message)
                        .contains(errorMessage);
                    assertThat(err.name)
                        .isEqualTo("InvalidOperationException");
                });

                await assertThrows(() => {
                    return bulkInsert.timeSeriesFor(documentId, "Heartrate");
                }, err => {
                    assertThat(err.message)
                        .contains(errorMessage);
                    assertThat(err.name)
                        .isEqualTo("InvalidOperationException");
                });

                timeSeriesBulkInsert.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const val = (await session.timeSeriesFor(documentId, "Heartrate").get())[0];

            assertThat(val.values)
                .hasSize(1);
            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minute").toDate().getTime());
        }
    });

    it("canHaveBulkInsertWithDocumentsAndAttachmentAndCountersAndTimeSeries", async () => {
        const count = 100;
        const size = 64 * 1024;

        const baseLine = moment().startOf("day");

        const streams = new Map<string, Map<string, Buffer>>();
        const counters = new Map<string, string>();
        const bulks = new Map<string, IAttachmentsBulkInsert>();

        {
            const bulkInsert = store.bulkInsert();
            for (let i = 0; i < count; i++) {
                const id = "name/" + i;
                streams.set(id, new Map<string, Buffer>());

                // insert documents
                const user = new User();
                user.name = "Name_" + i;
                await bulkInsert.store(user, id);

                bulks.set(id, bulkInsert.attachmentsFor(id));
            }

            for (const bulk of bulks.entries()) {

                const bytes = [...new Array(size).keys()].map(x => Math.floor(Math.random() * 255));
                const bArr = Buffer.from(bytes);

                const name = bulk[0] + "_" + Math.floor(Math.random() * 100);

                // insert attachments
                await bulk[1].store(name, bArr);

                streams.get(bulk[0]).set(name, bArr);

                // insert Counters
                await bulkInsert.countersFor(bulk[0]).increment(name);
                counters.set(bulk[0], name);

                {
                    const timeSeriesBulkInsert = bulkInsert.timeSeriesFor(bulk[0], "HeartRate");
                    await timeSeriesBulkInsert.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitBit");
                    timeSeriesBulkInsert.dispose();
                }
            }

            await bulkInsert.finish();
        }

        for (const id of streams.keys()) {
            const session = store.openSession();
            const timeSeriesVal = (await session.timeSeriesFor(id, "HeartRate").get())[0];

            assertThat(timeSeriesVal.values)
                .hasSize(1);
            assertThat(timeSeriesVal.values[0])
                .isEqualTo(59);
            assertThat(timeSeriesVal.tag)
                .isEqualTo("watches/fitBit");
            assertThat(timeSeriesVal.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            for (const docId of streams.keys()) {
                for (const attachmentName of streams.get(docId).keys()) {
                    const attachment = await session.advanced.attachments.get(docId, attachmentName);
                    try {
                        assertThat(attachment.data)
                            .isNotNull();

                        const expected = streams.get(docId).get(attachment.details.name);
                        attachment.data.resume();
                        const actual = await readToBuffer(attachment.data);

                        assertThat(actual.equals(expected))
                            .isTrue();
                    } finally {
                        attachment.dispose();
                    }
                }
            }

            const val = (await store.operations.send(new GetCountersOperation(id, counters.get(id))))
                .counters[0].totalValue;
            assertThat(val)
                .isEqualTo(1);
        }
    });
});