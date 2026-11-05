import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { IDocumentStore, InMemoryDocumentSessionOperations, TimeSeriesEntry } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { addDays, addHours, addMinutes, addSeconds } from "date-fns";

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
                .append(addMinutes(baseLine, 1), [ 59 ], "watches/fitbit");
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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

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
                .append(addMinutes(baseLine, 1), [ 59 ], "watches/fitbit");
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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

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
                .isEqualTo(addMinutes(baseLine, 1).getTime());

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
                .append(addMinutes(baseLine, 1), 59, "watches/fitbit");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(addMinutes(baseLine, 2), 60, "watches/fitbit");
            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(addMinutes(baseLine, 3), 61, "watches/fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let val = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(addDays(baseLine, 2), addDays(baseLine, 3), start, pageSize);

            assertThat(val)
                .hasSize(0);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            val = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(addDays(baseLine, 1), addDays(baseLine, 4), start, pageSize)

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
                .get(addDays(baseLine, 1), addDays(baseLine, 4), start, pageSize);

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
                tsf.append(addSeconds(baseLine, i * 10), [ 6 ], "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 2),
                    addMinutes(baseLine, 10)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 10).getTime());

            // should load partial range from cache

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 5),
                    addMinutes(baseLine, 7)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(13);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 5).getTime());
            assertThat(vals[12].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 7).getTime());

            // should go to server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 40),
                    addMinutes(baseLine, 50)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            const ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 10).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());

            // should go to server to get [0, 2] and merge it into existing [2, 10]
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine, addMinutes(baseLine, 5));


            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(31);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(vals[30].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 5).getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 10).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());

            // should go to server to get [10, 16] and merge it into existing [0, 10]
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 8),
                    addMinutes(baseLine, 16)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 8).getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 16).getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 16).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());

            // should go to server to get range [17, 19]
            // and add it to cache in between [10, 16] and [40, 50]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 17),
                    addMinutes(baseLine, 19)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(vals)
                .hasSize(13);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 17).getTime());
            assertThat(vals[12].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 19).getTime());

            assertThat(ranges)
                .hasSize(3);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 16).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 17).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 19).getTime());

            assertThat(ranges[2].from.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());
            assertThat(ranges[2].to.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());

            // should go to server to get range [19, 40]
            // and merge the result with existing ranges [17, 19] and [40, 50]
            // into single range [17, 50]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 18),
                    addMinutes(baseLine, 48)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(6);

            assertThat(vals)
                .hasSize(181);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 18).getTime());
            assertThat(vals[180].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 48).getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 16).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 17).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());

            // should go to server to get range [16, 17]
            // and merge the result with existing ranges [0, 16] and [17, 50]
            // into single range [0, 50]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 12),
                    addMinutes(baseLine, 22)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            assertThat(vals)
                .hasSize(61);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 12).getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 22).getTime());

            assertThat(ranges)
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 50).getTime());
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
                tsf.append(addSeconds(baseLine, i * 10), [ 60 ], "watches/fitbit");
            }

            tsf = session.timeSeriesFor("users/ayende", "Heartrate2");

            tsf.append(addHours(baseLine, 1), 70, "watches/fitbit");
            tsf.append(addMinutes(baseLine, 90), 75, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 2),
                    addMinutes(baseLine, 10)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 10).getTime());

            // should go the server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 22),
                    addMinutes(baseLine, 32)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 22).getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 32).getTime());

            // should go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 1),
                    addMinutes(baseLine, 11)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 11).getTime());

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            let ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 11).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 22).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 32).getTime());

            // should go to server to get [32, 35] and merge with [22, 32]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 25),
                    addMinutes(baseLine, 35)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 25).getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 35).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 11).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 22).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 35).getTime());

            // should go to server to get [20, 22] and [35, 40]
            // and merge them with [22, 35] into a single range [20, 40]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 20),
                    addMinutes(baseLine, 40)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(vals)
                .hasSize(121);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 20).getTime());
            assertThat(vals[120].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 11).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 20).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());

            // should go to server to get [15, 20] and merge with [20, 40]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 15),
                    addMinutes(baseLine, 35)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(6);

            assertThat(vals)
                .hasSize(121);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 15).getTime());
            assertThat(vals[120].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 35).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 11).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 15).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());

            // should go to server and add new cache entry for Heartrate2

            vals = await session.timeSeriesFor("users/ayende", "Heartrate2")
                .get(
                    baseLine,
                    addHours(baseLine, 2)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addHours(baseLine, 1).getTime());
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 90).getTime());

            const ranges2 = cache.get("Heartrate2");
            assertThat(ranges2)
                .hasSize(1);

            assertThat(ranges2[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges2[0].to.getTime())
                .isEqualTo(addHours(baseLine, 2).getTime());

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate2")
                .get(
                    addMinutes(baseLine, 30),
                    addMinutes(baseLine, 100)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            assertThat(vals)
                .hasSize(2);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addHours(baseLine, 1).getTime());
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 90).getTime());

            // should go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 42),
                    addMinutes(baseLine, 43)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(8);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 42).getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 43).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(3);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 11).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 15).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 40).getTime());

            assertThat(ranges[2].from.getTime())
                .isEqualTo(addMinutes(baseLine, 42).getTime());
            assertThat(ranges[2].to.getTime())
                .isEqualTo(addMinutes(baseLine, 43).getTime());

            // should go to server and to get the missing parts and merge all ranges into [0, 45]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    baseLine,
                    addMinutes(baseLine, 45)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(9);

            assertThat(vals)
                .hasSize(271);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(vals[270].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 45).getTime());

            ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 45).getTime());
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
                tsf.append(addSeconds(baseLine, i * 10), 60, "watches/fitbit");
            }

            tsf = session.timeSeriesFor("users/ayende", "Heartrate");

            tsf.append(addHours(baseLine, 1), 70, "watches/fitbit");
            tsf.append(addMinutes(baseLine, 90), 75, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 1),
                    addMinutes(baseLine, 2)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());


            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 5),
                    addMinutes(baseLine, 6)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 5).getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 6).getTime());

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const cache = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende");
            assertThat(cache)
                .isNotNull();

            const ranges = cache.get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 5).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 6).getTime());

            // should go to server to get [2, 3] and merge with [1, 2]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 2),
                    addMinutes(baseLine, 3)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 2).getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 3).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 3).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 5).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 6).getTime());

            // should go to server to get [4, 5] and merge with [5, 6]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 4),
                    addMinutes(baseLine, 5)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 4).getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 5).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 3).getTime());

            assertThat(ranges[1].from.getTime())
                .isEqualTo(addMinutes(baseLine, 4).getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(addMinutes(baseLine, 6).getTime());

            // should go to server to get [3, 4] and merge all ranges into [1, 6]

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, 3),
                    addMinutes(baseLine, 4)
                );

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 3).getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 4).getTime());

            assertThat(ranges)
                .isNotNull()
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 6).getTime());
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
                tsf.append(addSeconds(baseLine, i * 10), 60, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addHours(baseLine, -2),
                    addHours(baseLine, -1)
                );

            assertThat(vals)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addHours(baseLine, -2),
                    addHours(baseLine, -1)
                );

            assertThat(vals)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addMinutes(baseLine, -90),
                    addMinutes(baseLine, -70)
                );

            assertThat(vals)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should go to server to get [-60, 1] and merge with [-120, -60]
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(
                    addHours(baseLine, -1),
                    addMinutes(baseLine, 1)
                );

            assertThat(vals)
                .hasSize(7);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            const inMemoryDocumentSession = session as unknown as InMemoryDocumentSessionOperations;

            const ranges = inMemoryDocumentSession.timeSeriesByDocId.get("users/ayende").get("Heartrate");
            assertThat(ranges)
                .isNotNull()
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(addHours(baseLine, -2).getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(addMinutes(baseLine, 1).getTime());
        }
    })

    describe("cached range boundaries between entries", () => {
        const baseLine = new Date("2024-01-01T01:30:00Z");
        const timestamps = (entries: TimeSeriesEntry[]) => entries.map(x => x.timestamp.toISOString()).join();
        const days = (...offsets: number[]) => offsets.map(day => addDays(baseLine, day).toISOString()).join();

        beforeEach(async () => {
            const session = store.openSession();
            await session.store(new User(), "users/1");
            const ts = session.timeSeriesFor("users/1", "HR");
            for (let day = 0; day < 5; day++) {
                ts.append(addDays(baseLine, day), [ day ]);
            }
            await session.saveChanges();
        });

        it("shouldMergeOpenEndedRangeWithCachedRange", async () => {
            const session = store.openSession();
            const ts = session.timeSeriesFor("users/1", "HR");

            assertThat(await ts.get(addHours(baseLine, 12), addHours(baseLine, 60)))
                .hasSize(2);

            assertThat(timestamps(await ts.get()))
                .isEqualTo(days(0, 1, 2, 3, 4));
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(timestamps(await ts.get()))
                .isEqualTo(days(0, 1, 2, 3, 4));
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
        });

        it("shouldMergeGapsBetweenDisjointCachedRanges", async () => {
            const session = store.openSession();
            const ts = session.timeSeriesFor("users/1", "HR");

            await ts.get(addHours(baseLine, 12), addHours(baseLine, 36));
            await ts.get(addHours(baseLine, 60), addHours(baseLine, 84));

            assertThat(timestamps(await ts.get(null, addHours(baseLine, 80))))
                .isEqualTo(days(0, 1, 2, 3));
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
        });

        it("shouldMergeOpenEndedRangeWithIncludedRange", async () => {
            const session = store.openSession();
            await session.load("users/1", {
                includes: i => i.includeTimeSeries("HR", addHours(baseLine, 12), addHours(baseLine, 60))
            });

            assertThat(timestamps(await session.timeSeriesFor("users/1", "HR").get()))
                .isEqualTo(days(0, 1, 2, 3, 4));
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
        });
    });
});