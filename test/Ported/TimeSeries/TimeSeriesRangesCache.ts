import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { IDocumentStore, InMemoryDocumentSessionOperations } from "../../../src";
import { User } from "../../Assets/Entities";
import moment = require("moment");
import { assertThat } from "../../Utils/AssertExtensions";

describe("TimeSeriesRangesCacheTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldGetTimeSeriesValueFromCache", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(1, "minute").toDate(), [ 59 ], "watches/fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let val = (await session.timeSeriesFor("users/ayende", "Heartrate")
                .get())[0];

            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should load from cache
            val = (await session.timeSeriesFor("users/ayende", "Heartrate")
                .get())[0];

            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("shouldGetPartialRangeFromCache", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(1, "minute").toDate(), [ 59 ], "watches/fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let val = (await session.timeSeriesFor("users/ayende", "Heartrate")
                .get())[0];

            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should load from cache
            val = (await session.timeSeriesFor("users/ayende", "Heartrate")
                .get())[0];

            assertThat(val.values[0])
                .isEqualTo(59);
            assertThat(val.tag)
                .isEqualTo("watches/fitbit");
            assertThat(val.timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            const ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(1);
        }
    });

    it("shouldGetPartialRangeFromCache2", async () => {
        const start = 5;
        const pageSize = 10;

        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(1, "minutes").toDate(), 59, "watches/fitbit");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(2, "minutes").toDate(), 60, "watches/fitbit");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(3, "minutes").toDate(), 61, "watches/fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let val = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(2, "days").toDate(), baseLine.clone().add(3, "days").toDate(), start, pageSize);

            assertThat(val)
                .hasSize(0);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            val = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(1, "days").toDate(), baseLine.clone().add(4, "days").toDate(), start, pageSize)

            assertThat(val)
                .hasSize(0);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
        }

        {
            const session = store.openSession();
            let val = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(start, pageSize);

            assertThat(val)
                .hasSize(0);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            val = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(1, "days").toDate(), baseLine.clone().add(4, "days").toDate(), start, pageSize);

            assertThat(val)
                .hasSize(0);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("shouldMergeTimeSeriesRangesInCache", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), [ 6 ], "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(2, "minutes").toDate(),
                    baseLine.clone().add(10, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            // should load partial range from cache

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(5, "minutes").toDate(),
                    baseLine.clone().add(7, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(13);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
            assertThat(vals[12].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(7, "minutes").toDate().getTime());

            // should go to server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(40, "minutes").toDate(),
                    baseLine.clone().add(50, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            const ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // should go to server to get [0, 2] and merge it into existing [2, 10]
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.toDate(), baseLine.clone().add(5, "minutes").toDate());


            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(31);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[30].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // should go to server to get [10, 16] and merge it into existing [0, 10]
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(8, "minutes").toDate(),
                    baseLine.clone().add(16, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(8, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // should go to server to get range [17, 19]
            // and add it to cache in between [10, 16] and [40, 50]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(17, "minutes").toDate(),
                    baseLine.clone().add(19, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(vals)
                .hasSize(13);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(17, "minutes").toDate().getTime());
            assertThat(vals[12].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(19, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(3);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(17, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(19, "minutes").toDate().getTime());

            assertThat(ranges[2].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[2].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // should go to server to get range [19, 40]
            // and merge the result with existing ranges [17, 19] and [40, 50]
            // into single range [17, 50]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(18, "minutes").toDate(),
                    baseLine.clone().add(48, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(6);

            assertThat(vals)
                .hasSize(181);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(18, "minutes").toDate().getTime());
            assertThat(vals[180].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(48, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(17, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // should go to server to get range [16, 17]
            // and merge the result with existing ranges [0, 16] and [17, 50]
            // into single range [0, 50]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(12, "minutes").toDate(),
                    baseLine.clone().add(22, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            assertThat(vals)
                .hasSize(61);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(12, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(22, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());
        }
    });

    it("shouldMergeTimeSeriesRangesInCache2", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), [ 60 ], "watches/fitbit");
            }

            tsf = session.timeSeriesFor("users/ayende", "Heartrate2");

            tsf.append(baseLine.clone().add(1, "hour").toDate(), 70, "watches/fitbit");
            tsf.append(baseLine.clone().add(90, "minutes").toDate(), 75, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(2, "minutes").toDate(),
                    baseLine.clone().add(10, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            // should go the server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(22, "minutes").toDate(),
                    baseLine.clone().add(32, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(22, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(32, "minutes").toDate().getTime());

            // should go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(1, "minutes").toDate(),
                    baseLine.clone().add(11, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(11, "minutes").toDate().getTime());

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            let ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(11, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(22, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(32, "minutes").toDate().getTime());

            // should go to server to get [32, 35] and merge with [22, 32]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(25, "minutes").toDate(),
                    baseLine.clone().add(35, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(25, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(35, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(11, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(22, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(35, "minutes").toDate().getTime());

            // should go to server to get [20, 22] and [35, 40]
            // and merge them with [22, 35] into a single range [20, 40]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(20, "minutes").toDate(),
                    baseLine.clone().add(40, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(vals)
                .hasSize(121);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(20, "minutes").toDate().getTime());
            assertThat(vals[120].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(11, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(20, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());

            // should go to server to get [15, 20] and merge with [20, 40]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(15, "minutes").toDate(),
                    baseLine.clone().add(35, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(6);

            assertThat(vals)
                .hasSize(121);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());
            assertThat(vals[120].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(35, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(11, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());

            // should go to server and add new cache entry for Heartrate2

            vals = await session.timeSeriesFor("users/ayende", "Heartrate2")
                .get(
                    baseLine.toDate(),
                    baseLine.clone().add(2, "hours").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "hour").toDate().getTime());
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(90, "minutes").toDate().getTime());

            const ranges2 = cache.get("Heartrate2");
            assertThat(ranges2)
                .hasSize(1);

            assertThat(ranges2[0].from.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges2[0].to.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate2")
                .get(
                    baseLine.clone().add(30, "minutes").toDate(),
                    baseLine.clone().add(100, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "hour").toDate().getTime());
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(90, "minutes").toDate().getTime());

            // should go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(42, "minutes").toDate(),
                    baseLine.clone().add(43, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(8);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(42, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(43, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(3);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(11, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());

            assertThat(ranges[2].from.getTime())
                .isEqualTo(baseLine.clone().add(42, "minutes").toDate().getTime());
            assertThat(ranges[2].to.getTime())
                .isEqualTo(baseLine.clone().add(43, "minutes").toDate().getTime());

            // should go to server and to get the missing parts and merge all ranges into [0, 45]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.toDate(),
                    baseLine.clone().add(45, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(9);

            assertThat(vals)
                .hasSize(271);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[270].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(45, "minutes").toDate().getTime());

            ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(45, "minutes").toDate().getTime());
        }
    });

    it("shouldMergeTimeSeriesRangesInCache3", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), 60, "watches/fitbit");
            }

            tsf = session.timeSeriesFor("users/ayende", "Heartrate");

            tsf.append(baseLine.clone().add(1, "hours").toDate(), 70, "watches/fitbit");
            tsf.append(baseLine.clone().add(90, "minutes").toDate(), 75, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(1, "minutes").toDate(),
                    baseLine.clone().add(2, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());


            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(5, "minutes").toDate(),
                    baseLine.clone().add(6, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(6, "minutes").toDate().getTime());

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            const ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(6, "minutes").toDate().getTime());

            // should go to server to get [2, 3] and merge with [1, 2]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(2, "minutes").toDate(),
                    baseLine.clone().add(3, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(6, "minutes").toDate().getTime());

            // should go to server to get [4, 5] and merge with [5, 6]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(4, "minutes").toDate(),
                    baseLine.clone().add(5, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(4, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(4, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(6, "minutes").toDate().getTime());

            // should go to server to get [3, 4] and merge all ranges into [1, 6]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(3, "minutes").toDate(),
                    baseLine.clone().add(4, "minutes").toDate()
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(4, "minutes").toDate().getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(6, "minutes").toDate().getTime());
        }
    });

    it("canHandleRangesWithNoValues", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");
            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), 60, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(-2, "hours").toDate(),
                    baseLine.clone().add(-1, "hours").toDate()
                );

            assertThat(vals)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(-2, "hours").toDate(),
                    baseLine.clone().add(-1, "hours").toDate()
                );

            assertThat(vals)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(-90, "minutes").toDate(),
                    baseLine.clone().add(-70, "minutes").toDate()
                );

            assertThat(vals)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should go to server to get [-60, 1] and merge with [-120, -60]
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine.clone().add(-1, "hours").toDate(),
                    baseLine.clone().add(1, "minutes").toDate()
                );

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const ranges = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende").get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(-2, "hours").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(1, "minutes").toDate().getTime());
        }
    })
});