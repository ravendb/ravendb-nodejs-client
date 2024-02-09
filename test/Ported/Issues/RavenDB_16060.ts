import {
    ConfigureTimeSeriesOperation,
    IDocumentStore,
    InMemoryDocumentSessionOperations,
    RawTimeSeriesPolicy, SessionTimeSeriesBase, TimeSeriesCollectionConfiguration, TimeSeriesConfiguration,
    TimeSeriesPolicy,
    TimeSeriesValue
} from "../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { TimeValue } from "../../../src/Primitives/TimeValue";
import { StockPrice } from "../TimeSeries/TimeSeriesTypedSession";
import { delay } from "bluebird";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB_16060Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIncludeTypedTimeSeries", async () => {
        const baseLine = moment().utc().startOf("month");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";

            await session.store(user, "users/ayende");

            const ts = session.timeSeriesFor("users/ayende", HeartRateMeasure);
            ts.append(baseLine.toDate(), HeartRateMeasure.create(59), "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const items = await session
                .query(User)
                .include(x => x.includeTimeSeries("heartRateMeasures"))
                .all();

            for (const item of items) {
                const timeseries = await session.timeSeriesFor(item.id, "heartRateMeasures", HeartRateMeasure).get();
                assertThat(timeseries)
                    .hasSize(1);
                assertThat(timeseries[0].value.heartRate)
                    .isEqualTo(59);
            }

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("canServeTimeSeriesFromCache_Typed", async function () {
        //RavenDB-16136
        const baseLine = moment().utc().startOf("month");

        const id = "users/gabor";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Gabor";
            await session.store(user, id);

            const ts = session.timeSeriesFor(id, HeartRateMeasure);

            ts.append(baseLine.toDate(), HeartRateMeasure.create(59), "watches/fitbit");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const timeseries = await session.timeSeriesFor(id, HeartRateMeasure)
                .get();
            assertThat(timeseries)
                .hasSize(1);
            assertThat(timeseries[0].value.heartRate)
                .isEqualTo(59);

            const timeseries2 = await session.timeSeriesFor(id, HeartRateMeasure).get();
            assertThat(timeseries2)
                .hasSize(1);
            assertThat(timeseries2[0].value.heartRate)
                .isEqualTo(59);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("includeTimeSeriesAndMergeWithExistingRangesInCache_Typed", async function () {
        const baseLine = moment().utc().startOf("month");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, documentId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, HeartRateMeasure);

            for (let i = 0; i < 360; i++) {
                const typedMeasure = HeartRateMeasure.create(6);
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), typedMeasure, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(2, "minutes").toDate(), baseLine.clone().add(10, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            let user = await session
                .load<User>(documentId, {
                    documentType: User,
                    includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.clone().add(40, "minutes").toDate(), baseLine.clone().add(50, "minutes").toDate())
                });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(40, "minutes").toDate(), baseLine.clone().add(50, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(61);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            const sessionOperations = session as unknown as InMemoryDocumentSessionOperations;

            const cache = sessionOperations.timeSeriesByDocId.get(documentId);
            assertThat(cache)
                .isNotNull();
            const ranges = cache.get("heartRateMeasures");
            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // we intentionally evict just the document (without it's TS data),
            // so that Load request will go to server

            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get [0, 2] and merge it into existing [2, 10]
            user = await session.load(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.toDate(), baseLine.clone().add(2, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.toDate(), baseLine.clone().add(2, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(13);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[12].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // evict just the document

            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get [10, 16] and merge it into existing [0, 10]
            user = await session.load(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.clone().add(10, "minutes").toDate(), baseLine.clone().add(16, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(10, "minutes").toDate(), baseLine.clone().add(16, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(vals)
                .hasSize(37);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(vals[36].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());

            assertThat(ranges)
                .hasSize(2);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());
            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // evict just the document
            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get range [17, 19]
            // and add it to cache in between [10, 16] and [40, 50]

            user = await session.load(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.clone().add(17, "minutes").toDate(), baseLine.clone().add(19, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(17, "minutes").toDate(), baseLine.clone().add(19, "minutes").toDate());

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
                .isEqualTo(baseLine.toDate().getTime());
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

            // evict just the document
            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get range [19, 40]
            // and merge the result with existing ranges [17, 19] and [40, 50]
            // into single range [17, 50]

            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.clone().add(18, "minutes").toDate(), baseLine.clone().add(48, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(6);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(18, "minutes").toDate(), baseLine.clone().add(48, "minutes").toDate());

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
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(16, "minutes").toDate().getTime());
            assertThat(ranges[1].from.getTime())
                .isEqualTo(baseLine.clone().add(17, "minutes").toDate().getTime());
            assertThat(ranges[1].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // evict just the document
            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get range [12, 22]
            // and merge the result with existing ranges [0, 16] and [17, 50]
            // into single range [0, 50]

            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.clone().add(12, "minutes").toDate(), baseLine.clone().add(22, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(12, "minutes").toDate(), baseLine.clone().add(22, "minutes").toDate());

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
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // evict just the document
            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get range [50, ∞]
            // and merge the result with existing range [0, 50] into single range [0, ∞]

            user = await session.load(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", "Last", TimeValue.ofMinutes(10))
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(8);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, HeartRateMeasure)
                .get(baseLine.clone().add(50, "minutes").toDate(), null);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(8);

            assertThat(vals)
                .hasSize(60);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());
            assertThat(vals[59].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(59, "minutes").add(50, "seconds").toDate().getTime());

            assertThat(ranges)
                .hasSize(1);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(ranges[0].to)
                .isNull();
        }
    });

    it("includeTimeSeriesAndUpdateExistingRangeInCache_Typed", async function () {
        const baseLine = moment().utc().startOf("month");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", HeartRateMeasure);

            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), HeartRateMeasure.create(6), "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", HeartRateMeasure)
                .get(baseLine.clone().add(2, "minutes").toDate(), baseLine.clone().add(10, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            session.timeSeriesFor("users/ayende", HeartRateMeasure)
                .append(baseLine.clone().add(3, "minutes").add(3, "seconds").toDate(), HeartRateMeasure.create(6), "watches/fitbit");
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            const user = await session.load<User>("users/ayende", {
                documentType: User,
                includes: i => i.includeTimeSeries("heartRateMeasures", baseLine.clone().add(3, "minutes").toDate(), baseLine.clone().add(5, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", HeartRateMeasure)
                .get(baseLine.clone().add(3, "minutes").toDate(), baseLine.clone().add(5, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(14);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").add(3, "seconds").toDate().getTime());
            assertThat(vals[13].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
        }
    });

    it("canServeTimeSeriesFromCache_Rollup", async function () {
        const raw = new RawTimeSeriesPolicy(TimeValue.ofHours(24));

        const p1 = new TimeSeriesPolicy("By6Hours", TimeValue.ofHours(6), TimeValue.ofDays(4));
        const p2 = new TimeSeriesPolicy("By1Day", TimeValue.ofDays(1), TimeValue.ofDays(5));
        const p3 = new TimeSeriesPolicy("By30Minutes", TimeValue.ofMinutes(30), TimeValue.ofDays(2));
        const p4 = new TimeSeriesPolicy("By1Hour", TimeValue.ofMinutes(60), TimeValue.ofDays(3));

        const timeSeriesCollectionConfiguration = new TimeSeriesCollectionConfiguration();
        timeSeriesCollectionConfiguration.rawPolicy = raw;
        timeSeriesCollectionConfiguration.policies = [ p1, p2, p3, p4 ];

        const config = new TimeSeriesConfiguration();
        config.collections.set("users", timeSeriesCollectionConfiguration);
        config.policyCheckFrequencyInMs = 1_000;

        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));
        await store.timeSeries.register(User, StockPrice);

        const total = TimeValue.ofDays(12).value;

        const baseLine = moment().utc().startOf("month").add(-12, "days");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Karmel";
            await session.store(user, "users/karmel");

            const ts = session.timeSeriesFor("users/karmel", StockPrice);
            const entry = new StockPrice();
            let baseTime = baseLine.toDate().getTime();
            for (let i = 0; i <= total; i++) {
                entry.open = i;
                entry.close = i + 100_000;
                entry.high = i + 200_000;
                entry.low = i + 300_000;
                entry.volume = i + 400_000;
                baseTime += 60 * 1000;
                ts.append(new Date(baseTime), entry, "watches/fitbit");
            }

            await session.saveChanges();
        }

        await delay(3_000); // wait for rollups

        {
            const session = store.openSession();
            const ts = session.timeSeriesRollupFor("users/karmel", p1.name, StockPrice);
            let res = await ts.get();

            assertThat(res)
                .hasSize(16);

            // should not go to server
            res = await ts.get(baseLine.toDate(), baseLine.clone().add(1, "year").toDate());
            assertThat(res)
                .hasSize(16);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("canIncludeTypedTimeSeries_Rollup", async function () {
        const raw = new RawTimeSeriesPolicy(TimeValue.ofHours(24));

        const p1 = new TimeSeriesPolicy("By6Hours", TimeValue.ofHours(6), TimeValue.ofDays(4));
        const p2 = new TimeSeriesPolicy("By1Day", TimeValue.ofDays(1), TimeValue.ofDays(5));
        const p3 = new TimeSeriesPolicy("By30Minutes", TimeValue.ofMinutes(30), TimeValue.ofDays(2));
        const p4 = new TimeSeriesPolicy("By1Hour", TimeValue.ofMinutes(60), TimeValue.ofDays(3));

        const timeSeriesCollectionConfiguration = new TimeSeriesCollectionConfiguration();
        timeSeriesCollectionConfiguration.rawPolicy = raw;
        timeSeriesCollectionConfiguration.policies = [ p1, p2, p3, p4 ];

        const config = new TimeSeriesConfiguration();
        config.collections.set("users", timeSeriesCollectionConfiguration);
        config.policyCheckFrequencyInMs = 1_000;

        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));
        await store.timeSeries.register(User, StockPrice);

        const total = TimeValue.ofDays(12).value;
        const baseLine = moment().utc().startOf("month").add(-12, "days");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Karmel";
            await session.store(user, "users/karmel");

            const ts = session.timeSeriesFor("users/karmel", StockPrice);
            const entry = new StockPrice();
            for (let i = 0; i <= total; i++) {
                entry.open = i;
                entry.close = i + 100_000;
                entry.high = i + 200_000;
                entry.low = i + 300_000;
                entry.volume = i + 400_000;
                ts.append(baseLine.clone().add(i, "minutes").toDate(), entry, "watches/fitbit");
            }

            await session.saveChanges();
        }

        await delay(3_000); // wait for rollups

        {
            const session = store.openSession();
            const user = await session.query(User)
                .include(i => i.includeTimeSeries("stockPrices@" + p1.name))
                .first();

            // should not go to server
            const res = await session.timeSeriesRollupFor(user.id, p1.name, StockPrice).get();

            assertThat(res)
                .hasSize(16);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });
});

class HeartRateMeasure {
    public static readonly TIME_SERIES_VALUES: TimeSeriesValue<HeartRateMeasure> = ["heartRate"];

    public heartRate: number;

    public static create(heartRate: number) {
        const heartRateMeasure = new HeartRateMeasure();
        heartRateMeasure.heartRate = heartRate;
        return heartRateMeasure;
    }
}