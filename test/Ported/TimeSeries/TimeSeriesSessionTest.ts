import { IDocumentStore, InMemoryDocumentSessionOperations } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("TimeSeriesSessionTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateSimpleTimeSeries", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const val = (await session.timeSeriesFor("users/ayende", "Heartrate")
                .get())[0];

            assertThat(val.values)
                .hasSize(1);
            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.add(1, "minute").toDate().getTime());
        }
    });

    it("canCreateSimpleTimeSeries2", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), 60, "watches/fitbit");
            tsf.append(baseLine.clone().add(3, "minutes").toDate(), 61, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const val = await session.timeSeriesFor("users/ayende", "Heartrate").get();
            assertThat(val)
                .hasSize(3);
        }
    });

    it("timeSeriesShouldBeCaseInsensitiveAndKeepOriginalCasing", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.timeSeriesFor("users/ayende", "HeartRate")
                .append(baseLine.clone().add(2, "minutes").toDate(), 60, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", User);
            const val = await session.timeSeriesFor("users/ayende", "heartrate")
                .get();

            assertThat(val[0].values)
                .hasSize(1);
            assertThat(val[0].values[0])
                .isEqualTo(59);
            assertThat(val[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(val[1].values)
                .hasSize(1);
            assertThat(val[1].values[0])
                .isEqualTo(60);
            assertThat(val[1].tag)
                .isEqualTo("watches/fitbit");
            assertThat(val[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(session.advanced.getTimeSeriesFor(user))
                .hasSize(1);
            assertThat(session.advanced.getTimeSeriesFor(user))
                .contains("Heartrate");
        }

        {
            const session = store.openSession();
            session.timeSeriesFor("users/ayende", "HeartRatE")
                .delete();
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.timeSeriesFor("users/ayende", "HeArtRate")
                .append(baseLine.clone().add(3, "minutes").toDate(), 61, "watches/fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", User);
            const vals = await session.timeSeriesFor("users/ayende", "heartrate")
                .get();
            assertThat(vals)
                .hasSize(1);

            const val = vals[0];

            assertThat(val.values)
                .hasSize(1);
            assertThat(val.values[0])
                .isEqualTo(61);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
            assertThat(session.advanced.getTimeSeriesFor(user))
                .contains("HeArtRate");
        }
    });

    it("canDeleteTimestamp", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), 69, "watches/fitbit");
            tsf.append(baseLine.clone().add(3, "minutes").toDate(), 79, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .deleteAt(baseLine.clone().add(2, "minutes").toDate());

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate").get();

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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), 70, "watches/apple");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate").get();

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
                .isEqualTo(70);
            assertThat(vals[1].tag)
                .isEqualTo("watches/apple");
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
        }
    });

    it("usingDifferentNumberOfValues_SmallToLarge", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), [ 70, 120, 80], "watches/apple");
            tsf.append(baseLine.clone().add(3, "minutes").toDate(), 69, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate").get();

            assertThat(vals)
                .hasSize(3);
            assertThat(vals[0].values)
                .hasSize(1);
            assertThat(vals[0].values[0])
                .isEqualTo(59);
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minute").toDate().getTime());

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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(1, "minutes").toDate(), [ 70, 120, 80 ], "watches/apple");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), 59, "watches/fitbit");
            tsf.append(baseLine.clone().add(3, "minutes").toDate(), 69, "watches/fitbit");

            await session.saveChanges();
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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(1, "minute").toDate(), [ 59 ], "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.clone().add(2, "minutes").toDate(), 61, "watches/fitbit");
            tsf.append(baseLine.clone().add(3, "minutes").toDate(), 62, "watches/apple-watch");

            await session.saveChanges();
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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        let offset = 0;

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            for (let j = 0; j < 1000; j++) {
                tsf.append(baseLine.clone().add(offset++, "minutes").toDate(), [ offset ], "watches/fitbit");
            }

            await session.saveChanges();
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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        const retries = 1000;

        let offset = 0;

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");

            for (let j = 0; j < retries; j++) {
                tsf.append(baseLine.clone().add(offset, "minutes").toDate(), [ offset ], "watches/fitbit");
                offset += 5;
            }

            await session.saveChanges();
        }

        offset = 1;

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            const vals = await tsf.get();

            assertThat(vals)
                .hasSize(retries);

            for (let j = 0; j < retries; j++) {
                tsf.append(baseLine.clone().add(offset, "minutes").toDate(), [ offset ], "watches/fitbit");

                offset += 5;
            }

            await session.saveChanges();
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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            tsf.append(baseLine.toDate(), 58, "watches/fitbit");
            tsf.append(baseLine.clone().add(10, "minutes").toDate(), 60, "watches/fitbit");

            await session.saveChanges();
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

        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/karmel");
            session.timeSeriesFor("users/karmel", "Nasdaq2")
                .append(new Date(), 7547.31, "web");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.timeSeriesFor("users/karmel", "Heartrate2")
                .append(new Date(), 7547.31, "web");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.store(new User(), "users/ayende");
            session.timeSeriesFor("users/ayende", "Nasdaq")
                .append(new Date(), 7547.31, "web");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(moment().add(1, "minutes").toDate(), 58, "fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", User);
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
            session.timeSeriesFor("users/ayende", "heartrate") // putting ts name as lower cased
                .append(baseLine.clone().add(1, "minutes").toDate(), 58, "fitbit");

            await session.saveChanges();
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

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        let offset = 0;

        for (let i = 0; i < 100; i++) {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");

            for (let j = 0; j < 1000; j++) {
                tsf.append(baseLine.clone().add(offset++, "minutes").toDate(), offset, "watches/fitbit");
            }

            await session.saveChanges();
        }

        offset = 0;

        for (let i = 0; i < 100; i++) {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Pulse");

            for (let j = 0; j < 1000; j++) {
                tsf.append(baseLine.clone().add(offset++, "minutes").toDate(), offset, "watches/fitbit");
            }

            await session.saveChanges();
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

        const id = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, id);


            const timeSeriesFor = session.timeSeriesFor(id, "Heartrate");
            timeSeriesFor.append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
            timeSeriesFor.append(baseLine.clone().add(2, "minutes").toDate(), 59, "watches/fitbit");

            session.timeSeriesFor(id, "Heartrate2")
                .append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/apple");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.delete(id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor(id, "Heartrate")
                .get();

            assertThat(vals)
                .isNull();

            vals = await session.timeSeriesFor(id, "Heartrate2")
                .get();
            assertThat(vals)
                .isNull();
        }
    });

    it("canSkipAndTakeTimeSeries", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");

            for (let i = 0; i < 100; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), 100 + i, "watches/fitbit");
            }

            await session.saveChanges();
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

    it("shouldEvictTimeSeriesUponEntityEviction", async () => {
        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";

            await session.store(user, documentId);

            let tsf = session.timeSeriesFor(documentId, "Heartrate");

            for (let i = 0; i < 60; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), 100 + i, "watches/fitbit");
            }

            tsf = session.timeSeriesFor(documentId, "BloodPressure");

            for (let i = 0; i < 10; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), [ 120 - i , 80 + i ], "watches/apple");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>(documentId, User);
            let tsf = session.timeSeriesFor(user, "Heartrate");

            let vals = await tsf.get(baseLine.toDate(), baseLine.clone().add(10, "minutes").toDate());
            assertThat(vals)
                .hasSize(11);

            vals = await tsf.get(baseLine.clone().add(20, "minutes").toDate(), baseLine.clone().add(50, "minutes").toDate());

            assertThat(vals)
                .hasSize(31);

            tsf = session.timeSeriesFor(user, "BloodPressure");

            vals = await tsf.get();

            assertThat(vals)
                .hasSize(10);
            
            const sessionOperations = session as unknown as InMemoryDocumentSessionOperations;

            assertThat(sessionOperations.timeSeriesByDocId)
                .hasSize(1);

            let cache = sessionOperations.timeSeriesByDocId.get(documentId);
            assertThat(cache)
                .hasSize(2);

            let ranges = cache.get("Heartrate");
            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(ranges[0].entries)
                .hasSize(11);
            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(20, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            assertThat(ranges[1].entries)
                .hasSize(31);

            ranges = cache.get("BloodPressure");

            assertThat(ranges)
                .hasSize(1);

            assertThat(ranges[0].from)
                .isNull();
            assertThat(ranges[0].to)
                .isNull();
            assertThat(ranges[0].entries)
                .hasSize(10);

            session.advanced.evict(user);

            cache = sessionOperations.timeSeriesByDocId.get(documentId);

            assertThat(cache)
                .isNull();
            assertThat(sessionOperations.timeSeriesByDocId)
                .hasSize(0);
        }
    });

    it("getAllTimeSeriesNamesWhenNoTimeSeries", async () => {
        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/karmel");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/karmel", User);
            const tsNames = session.advanced.getTimeSeriesFor(user);
            assertThat(tsNames)
                .hasSize(0);
        }
    });

    it("getSingleTimeSeriesWhenNoTimeSeries", async () => {
        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/karmel");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/karmel", User);
            const ts = await session.timeSeriesFor(user, "unicorns")
                .get();
            assertThat(ts)
                .isNull();
        }
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

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(docId, "Heartrate");

            const entries = await tsf.get();
            assertThat(entries)
                .hasSize(100);

            // null From, To
            tsf.delete();
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const entries = await session.timeSeriesFor(docId, "Heartrate").get();
            assertThat(entries)
                .isNull();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(docId, "BloodPressure");

            const entries = await tsf.get();
            assertThat(entries)
                .hasSize(100);

            // null to
            tsf.delete(baseLine.clone().add(50, "minutes").toDate(), null);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const entries = await session.timeSeriesFor(docId, "BloodPressure")
                .get();

            assertThat(entries)
                .hasSize(50);
        }

        {
            const session = store.openSession();
            const tsf = await session.timeSeriesFor(docId, "BodyTemperature");

            const entries = await tsf.get();
            assertThat(entries)
                .hasSize(100);

            // null from
            tsf.delete(null, baseLine.clone().add(19, "minutes").toDate());

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const entries = await session.timeSeriesFor(docId, "BodyTemperature")
                .get();

            assertThat(entries)
                .hasSize(80);
        }
    })
});
