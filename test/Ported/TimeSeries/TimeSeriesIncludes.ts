import { IDocumentStore, InMemoryDocumentSessionOperations } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { Company, Order } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { TimeValue } from "../../../src/Primitives/TimeValue";
import { DateUtil } from "../../../src/Utility/DateUtil";

describe("TimeSeriesIncludesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("sessionLoadWithIncludeTimeSeries", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();

            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1-A");

            const order = new Order();
            order.company = "companies/1-A";
            await session.store(order, "orders/1-A");

            const tsf = session.timeSeriesFor("orders/1-A", "Heartrate");
            tsf.append(baseLine.toDate(), 67, "watches/apple");
            tsf.append(baseLine.clone().add(5, "minutes").toDate(), 64, "watches/apple");
            tsf.append(baseLine.clone().add(10, "minutes").toDate(), 65, "watches/fitbit");

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const order = await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i.includeDocuments("company").includeTimeSeries("Heartrate")
            });

            const company = await session.load<Company>(order.company, Company);
            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server
            const values = await session.timeSeriesFor(order, "Heartrate").get();

            assertThat(values)
                .hasSize(3);

            assertThat(values[0].values)
                .hasSize(1);
            assertThat(values[0].values[0])
                .isEqualTo(67);
            assertThat(values[0].tag)
                .isEqualTo("watches/apple");
            assertThat(values[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(values[1].values)
                .hasSize(1);
            assertThat(values[1].values[0])
                .isEqualTo(64);
            assertThat(values[1].tag)
                .isEqualTo("watches/apple");
            assertThat(values[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
            assertThat(values[2].values)
                .hasSize(1);
            assertThat(values[2].values[0])
                .isEqualTo(65);
            assertThat(values[2].tag)
                .isEqualTo("watches/fitbit");
            assertThat(values[2].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("includeTimeSeriesAndMergeWithExistingRangesInCache", async () => {
        const baseLine = moment().startOf("day");

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
            const tsf = session.timeSeriesFor(documentId, "Heartrate");
            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(10 * i, "seconds").toDate(), 6, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor(documentId, "Heartrate")
                .get(baseLine.clone().add(2, "minutes").toDate(), baseLine.clone().add(10, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            let user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("Heartrate",
                    baseLine.clone().add(40, "minutes").toDate(),
                    baseLine.clone().add(50, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, "Heartrate")
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

            const ranges = cache.get("Heartrate");
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

            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries(
                    "Heartrate", baseLine.toDate(), baseLine.clone().add(2, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            // should not go to server

            vals = await session.timeSeriesFor(documentId, "Heartrate")
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
            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries(
                    "Heartrate",
                    baseLine.clone().add(10, "minutes").toDate(),
                    baseLine.clone().add(16, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            // should not go to server
            vals = await session.timeSeriesFor(documentId, "Heartrate")
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
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
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

            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries(
                    "Heartrate",
                    baseLine.clone().add(17, "minutes").toDate(),
                    baseLine.clone().add(19, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            // should not go to server
            vals = await session.timeSeriesFor(documentId, "Heartrate")
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

            // evict just the document
            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get range [19, 40]
            // and merge the result with existing ranges [17, 19] and [40, 50]
            // into single range [17, 50]

            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries(
                    "Heartrate",
                    baseLine.clone().add(18, "minutes").toDate(),
                    baseLine.clone().add(48, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(6);

            // should not go to server
            vals = await session.timeSeriesFor(documentId, "Heartrate")
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
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
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
                includes: i => i.includeTimeSeries(
                    "Heartrate",
                    baseLine.clone().add(12, "minutes").toDate(),
                    baseLine.clone().add(22, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(7);

            // should not go to server
            vals = await session.timeSeriesFor(documentId, "Heartrate")
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
                .isEqualTo(baseLine.clone().add(0, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(50, "minutes").toDate().getTime());

            // evict just the document
            sessionOperations.documentsByEntity.evict(user);
            sessionOperations.documentsById.remove(documentId);

            // should go to server to get range [50, ∞]
            // and merge the result with existing range [0, 50] into single range [0, ∞]

            user = await session.load<User>(documentId, {
                documentType: User,
                includes: i => i.includeTimeSeries("heartrate", "Last", TimeValue.ofMinutes(10))
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(8);

            // should not go to server
            vals = await session.timeSeriesFor(documentId, "heartrate")
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

    it("includeTimeSeriesAndUpdateExistingRangeInCache", async () => {
        const baseLine = moment().startOf("day");

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
            const tsf = session.timeSeriesFor(documentId, "Heartrate");
            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), 6, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(2, "minutes").toDate(), baseLine.clone().add(10, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(49);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "minutes").toDate().getTime());
            assertThat(vals[48].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            session.timeSeriesFor("users/ayende", "Heartrate")
                .append(baseLine.clone().add(3, "minutes").add(3, "seconds").toDate(), 6, "watches/fitbit");

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            const user = await session.load<User>("users/ayende", {
                documentType: User,
                includes: i => i.includeTimeSeries(
                    "Heartrate",
                    baseLine.clone().add(3, "minutes").toDate(),
                    baseLine.clone().add(5, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(3, "minutes").toDate(), baseLine.clone().add(5, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(vals)
                .hasSize(14);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
            assertThat(vals[1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "seconds").add(3, "minutes").toDate().getTime());
            assertThat(vals[13].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());
        }
    });

    it("includeMultipleTimeSeries", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            for (let i = 0; i < 360; i++) {
                session.timeSeriesFor("users/ayende", "Heartrate")
                    .append(baseLine.clone().add(i * 10, "seconds").toDate(), 6, "watches/fitbit");
                session.timeSeriesFor("users/ayende", "BloodPressure")
                    .append(baseLine.clone().add(i * 10, "seconds").toDate(), 66, "watches/fitbit");
                session.timeSeriesFor("users/ayende", "Nasdaq")
                    .append(baseLine.clone().add(i * 10, "seconds").toDate(), 8097.23, "nasdaq.com");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/ayende", {
                documentType: User,
                includes: i => i
                    .includeTimeSeries(
                        "Heartrate",
                        baseLine.clone().add(3, "minutes").toDate(),
                        baseLine.clone().add(5, "minutes").toDate())
                    .includeTimeSeries(
                        "BloodPressure",
                        baseLine.clone().add(40, "minutes").toDate(),
                        baseLine.clone().add(45, "minutes").toDate())
                    .includeTimeSeries(
                        "Nasdaq",
                        baseLine.clone().add(15, "minutes").toDate(),
                        baseLine.clone().add(25, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(user.name)
                .isEqualTo("Oren");

            // should not go to server

            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(3, "minutes").toDate(), baseLine.clone().add(5, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(13);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(3, "minutes").toDate().getTime());
            assertThat(vals[12].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(5, "minutes").toDate().getTime());

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "BloodPressure")
                .get(baseLine.clone().add(42, "minutes").toDate(), baseLine.clone().add(43, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(7);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(42, "minutes").toDate().getTime());
            assertThat(vals[6].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(43, "minutes").toDate().getTime());

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "BloodPressure")
                .get(baseLine.clone().add(40, "minutes").toDate(), baseLine.clone().add(45, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(31);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(40, "minutes").toDate().getTime());
            assertThat(vals[30].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(45, "minutes").toDate().getTime());

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "Nasdaq")
                .get(baseLine.clone().add(15, "minutes").toDate(), baseLine.clone().add(25, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(61);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(15, "minutes").toDate().getTime());
            assertThat(vals[60].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(25, "minutes").toDate().getTime());
        }
    });

    it("shouldCacheEmptyTimeSeriesRanges", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/ayende");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            for (let i = 0; i < 360; i++) {
                session.timeSeriesFor("users/ayende", "Heartrate")
                    .append(baseLine.clone().add(i * 10, "seconds").toDate(), 6, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let user = await session.load<User>("users/ayende", {
                documentType: User,
                includes: i => i
                    .includeTimeSeries(
                        "Heartrate",
                        baseLine.clone().add(-30, "minutes").toDate(),
                        baseLine.clone().add(-10, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(user.name)
                .isEqualTo("Oren");

            // should not go to server

            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(-30, "minutes").toDate(), baseLine.clone().add(-10, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(0);

            let sessionOperations = session as unknown as InMemoryDocumentSessionOperations;
            let cache = sessionOperations.timeSeriesByDocId.get("users/ayende");
            let ranges = cache.get("Heartrate");

            assertThat(ranges)
                .hasSize(1);

            assertThat(ranges[0].entries)
                .hasSize(0);
            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(-30, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(-10, "minutes").toDate().getTime());

            // should not go to server
            vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.clone().add(-25, "minutes").toDate(), baseLine.clone().add(-15, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(0);

            session.advanced.evict(user);

            user = await session.load<User>("users/ayende", {
                documentType: User,
                includes: i => i
                    .includeTimeSeries(
                        "BloodPressure",
                        baseLine.clone().add(10, "minutes").toDate(),
                        baseLine.clone().add(30, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            // should not go to server

            vals = await session.timeSeriesFor("users/ayende", "BloodPressure")
                .get(baseLine.clone().add(10, "minutes").toDate(), baseLine.clone().add(30, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(vals)
                .hasSize(0);

            sessionOperations = session as unknown as InMemoryDocumentSessionOperations;

            cache = sessionOperations.timeSeriesByDocId.get("users/ayende");
            ranges = cache.get("BloodPRessure");

            assertThat(ranges)
                .hasSize(1);
            assertThat(ranges[0].entries)
                .hasSize(0);

            assertThat(ranges[0].from.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(ranges[0].to.getTime())
                .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());
        }
    });

    it("multiLoadWithIncludeTimeSeries", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Oren";
            await session.store(user1, "users/ayende");

            const user2 = new User();
            user2.name = "Pawel";
            await session.store(user2, "users/ppekrol");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf1 = session.timeSeriesFor("users/ayende", "Heartrate");
            const tsf2 = session.timeSeriesFor("users/ppekrol", "Heartrate");

            for (let i = 0; i < 360; i++) {
                tsf1.append(baseLine.clone().add(i * 10, "seconds").toDate(), 6, "watches/fitbit");

                if (i % 2 === 0) {
                    tsf2.append(baseLine.clone().add(i * 10, "seconds").toDate(), 7, "watches/fitbit");
                }
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const users = await session.load<User>(["users/ayende", "users/ppekrol"], {
                includes: i => i.includeTimeSeries("Heartrate", baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate())
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(users["users/ayende"].name)
                .isEqualTo("Oren");
            assertThat(users["users/ppekrol"].name)
                .isEqualTo("Pawel");

            // should not go to server

            let vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(181);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[180].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

            // should not go to server

            vals = await session.timeSeriesFor("users/ppekrol", "Heartrate")
                .get(baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(91);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[90].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());
        }
    });

    it("includeTimeSeriesAndDocumentsAndCounters", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            user.worksAt = "companies/1";
            await session.store(user, "users/ayende");

            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor("users/ayende", "Heartrate");

            for (let i = 0; i < 360; i++) {
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), 67, "watches/fitbit");
            }

            session.countersFor("users/ayende").increment("likes", 100);
            session.countersFor("users/ayende").increment("dislikes", 5);

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const user = await session.load<User>("users/ayende", {
                documentType: User,
                includes: i => i
                    .includeDocuments("worksAt")
                    .includeTimeSeries("Heartrate", baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate())
                    .includeCounter("likes")
                    .includeCounter("dislikes")
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(user.name)
                .isEqualTo("Oren");

            // should not go to server

            const company = await session.load<Company>(user.worksAt, Company);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server
            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(181);

            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].values[0])
                .isEqualTo(67);
            assertThat(vals[180].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

            // should not go to server

            const counters = await session.countersFor("users/ayende")
                .getAll();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            let counter = counters["likes"];
            assertThat(counter)
                .isEqualTo(100);

            counter = counters["dislikes"];
            assertThat(counter)
                .isEqualTo(5);
        }
    });

    it("queryWithIncludeTimeSeries", async () => {
        const baseLine = moment().startOf("day");

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
                tsf.append(baseLine.clone().add(i * 10, "seconds").toDate(), 67, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query(User)
                .include(i => i.includeTimeSeries("Heartrate"));

            const result = await query.all();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(result[0].name)
                .isEqualTo("Oren");

            // should not go to server

            const vals = await session.timeSeriesFor("users/ayende", "Heartrate")
                .get(baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(vals)
                .hasSize(181);
            assertThat(vals[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(vals[0].tag)
                .isEqualTo("watches/fitbit");
            assertThat(vals[0].values[0])
                .isEqualTo(67);
            assertThat(vals[180].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());
        }
    });

    it("canLoadAsyncWithIncludeTimeSeries_LastRange_ByCount", async function () {
        const baseline = moment().startOf("day").add(12, "hours");

        {
            const session = store.openSession();
            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1-A");

            const order = new Order();
            order.company = "companies/1-A";
            await session.store(order, "orders/1-A");

            const tsf = session.timeSeriesFor("orders/1-A", "heartrate");

            for (let i = 0; i < 15; i++) {
                tsf.append(baseline.clone().add(-i, "minutes").toDate(), i, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const order = await session.load("orders/1-A", {
                documentType: Order,
                includes: i => i.includeDocuments("company")
                    .includeTimeSeries("heartrate", "Last", 11)
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server

            const company = await session.load(order.company, Company);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server
            const values = await session.timeSeriesFor(order, "heartrate")
                .get(baseline.clone().add(-10, "minutes").toDate(), null);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(values)
                .hasSize(11);

            for (let i = 0; i < values.length; i++) {
                assertThat(values[i].values)
                    .hasSize(1);
                assertThat(values[i].values[0])
                    .isEqualTo(values.length - 1 - i);
                assertThat(values[i].tag)
                    .isEqualTo("watches/fitbit");
                assertThat(values[i].timestamp.getTime())
                    .isEqualTo(baseline.clone().add(-(values.length - 1 - i), "minutes").toDate().getTime());

            }
        }
    });

    it("canLoadAsyncWithInclude_AllTimeSeries_LastRange_ByTime", async function () {
        const baseline = moment().startOf("day");

        {
            const session = store.openSession();
            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1-A");

            const order = new Order();
            order.company = "companies/1-A";
            await session.store(order, "orders/1-A");

            const tsf = session.timeSeriesFor("orders/1-A", "heartrate");

            for (let i = 0; i < 15; i++) {
                tsf.append(baseline.clone().add(-i, "minutes").toDate(), i, "watches/bitfit");
            }

            const tsf2 = session.timeSeriesFor("orders/1-A", "speedrate");
            for (let i = 0; i < 15; i++) {
                tsf2.append(baseline.clone().add(-i, "minutes").toDate(), i, "watches/fitbit");
            }
            
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const order = await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i.includeDocuments("company").includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server
            const company = await session.load(order.company, Company);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server
            const heartrateValues = await session.timeSeriesFor(order, "heartrate")
                .get(baseline.clone().add(-10, "minutes").toDate(), null);

            assertThat(heartrateValues)
                .hasSize(11);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const speedrateValues = await session.timeSeriesFor(order, "speedrate")
                .get(baseline.clone().add(-10, "minutes").toDate(), null);

            assertThat(speedrateValues)
                .hasSize(11);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            for (let i = 0; i < heartrateValues.length; i++) {
                assertThat(heartrateValues[i].values)
                    .hasSize(1);
                assertThat(heartrateValues[i].values[0])
                    .isEqualTo(heartrateValues.length - 1 - i);
                assertThat(heartrateValues[i].tag)
                    .isEqualTo("watches/bitfit");
                assertThat(heartrateValues[i].timestamp.getTime())
                    .isEqualTo(baseline.clone().add(-(heartrateValues.length - 1 - i), "minutes").toDate().getTime());
            }

            for (let i = 0; i < speedrateValues.length; i++) {
                assertThat(speedrateValues[i].values)
                    .hasSize(1);
                assertThat(speedrateValues[i].values[0])
                    .isEqualTo(speedrateValues.length - 1 - i);
                assertThat(speedrateValues[i].tag)
                    .isEqualTo("watches/fitbit");
                assertThat(speedrateValues[i].timestamp.getTime())
                    .isEqualTo(baseline.clone().add(-(speedrateValues.length - 1 - i), "minutes").toDate().getTime());
            }
        }
    });

    it("canLoadAsyncWithInclude_AllTimeSeries_LastRange_ByCount", async function () {
        const baseline = moment().startOf("day").add(3, "hours");

        {
            const session = store.openSession();
            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1-A");

            const order = new Order();
            order.company = "companies/1-A";
            await session.store(order, "orders/1-A");

            const tsf = session.timeSeriesFor("orders/1-A", "heartrate");
            for (let i = 0; i < 15; i++) {
                tsf.append(baseline.clone().add(-i, "minutes").toDate(), i, "watches/bitfit");
            }

            const tsf2 = session.timeSeriesFor("orders/1-A", "speedrate");
            for (let i = 0; i < 15; i++) {
                tsf2.append(baseline.clone().add(-i, "minutes").toDate(), i, "watches/fitbit");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const order = await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i.includeDocuments("company").includeAllTimeSeries("Last", 11)
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // should not go to server
            const company = await session.load(order.company, Company);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server
            const heartrateValues = await session.timeSeriesFor(order, "heartrate")
                .get(baseline.clone().add(-10, "minutes").toDate(), null);

            assertThat(heartrateValues)
                .hasSize(11);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const speedrateValues = await session.timeSeriesFor(order, "speedrate")
                .get(baseline.clone().add(-10, "minutes").toDate(), null);

            assertThat(speedrateValues)
                .hasSize(11);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            for (let i = 0; i < heartrateValues.length; i++) {
                assertThat(heartrateValues[i].values)
                    .hasSize(1);
                assertThat(heartrateValues[i].values[0])
                    .isEqualTo(heartrateValues.length - 1 - i);
                assertThat(heartrateValues[i].tag)
                    .isEqualTo("watches/bitfit");
                assertThat(heartrateValues[i].timestamp.getTime())
                    .isEqualTo(baseline.clone().add(-(heartrateValues.length - 1 - i), "minutes").toDate().getTime());
            }

            for (let i = 0; i < speedrateValues.length; i++) {
                assertThat(speedrateValues[i].values)
                    .hasSize(1);
                assertThat(speedrateValues[i].values[0])
                    .isEqualTo(speedrateValues.length - 1 - i);
                assertThat(speedrateValues[i].tag)
                    .isEqualTo("watches/fitbit");
                assertThat(speedrateValues[i].timestamp.getTime())
                    .isEqualTo(baseline.clone().add(-(speedrateValues.length - 1 - i), "minutes").toDate().getTime());
            }
        }
    });

    it("shouldThrowOnIncludeAllTimeSeriesAfterIncludingTimeSeries", async function () {
        {
            const session = store.openSession();
            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", Number.MAX_SAFE_INTEGER)
                        .includeAllTimeSeries("Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeTimeSeries("heartrate", "Last", Number.MAX_SAFE_INTEGER)
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeTimeSeries("heartrate", "Last", Number.MAX_SAFE_INTEGER)
                        .includeAllTimeSeries("Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeTimeSeries("heartrate", "Last", 1)
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeTimeSeries("heartrate", "Last", 11)
                        .includeAllTimeSeries("Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });
        }
    });

    it("shouldThrowOnIncludingTimeSeriesAfterIncludeAllTimeSeries", async function() {
        {
            const session = store.openSession();

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", Number.MAX_SAFE_INTEGER)
                        .includeAllTimeSeries("Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                        .includeTimeSeries("heartrate", "Last", Number.MAX_SAFE_INTEGER)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeTimeSeries("heartrate", "Last", Number.MAX_SAFE_INTEGER)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                        .includeTimeSeries("heartrate", "Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeTimeSeries("heartrate", "Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeAllTimeSeries' after using 'includeTimeSeries' or 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                        .includeTimeSeries("heartrate", "Last", Number.MAX_SAFE_INTEGER)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeTimeSeries("heartrate", "Last", TimeValue.MAX_VALUE)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", TimeValue.ofMinutes(10))
                        .includeTimeSeries("heartrate", "Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", 11)
                        .includeTimeSeries("heartrate", "Last", 11)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("IIncludeBuilder: Cannot use 'includeTimeSeries' or 'includeAllTimeSeries' after using 'includeAllTimeSeries'.");
            });


            assertThat(session.advanced.numberOfRequests)
                .isZero();
        }
    });

    it("shouldThrowOnIncludingTimeSeriesWithLastRangeZeroOrNegativeTime", async function () {
        {
            const session = store.openSession();
            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", TimeValue.MIN_VALUE)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("Time range type cannot be set to 'Last' when time is negative or zero.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("Last", TimeValue.ZERO)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("Time range type cannot be set to 'Last' when time is negative or zero.");
            });

            assertThat(session.advanced.numberOfRequests)
                .isZero();
        }
    });

    it("shouldThrowOnIncludingTimeSeriesWithNoneRange", async function () {
        {
            const session = store.openSession();

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("None", TimeValue.ofMinutes(-30))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("Time range type cannot be set to 'None' when time is specified.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("None", TimeValue.ZERO)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("Time range type cannot be set to 'None' when time is specified.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("None", 1024)
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("Time range type cannot be set to 'None' when count is specified.");
            });

            await assertThrows(async () => {
                await session.load<Order>("orders/1-A", {
                    documentType: Order,
                    includes: i => i
                        .includeDocuments("company")
                        .includeAllTimeSeries("None", TimeValue.ofMinutes(30))
                })
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
                assertThat(err.message)
                    .startsWith("Time range type cannot be set to 'None' when time is specified.");
            });

            assertThat(session.advanced.numberOfRequests)
                .isZero();
        }
    });

    it("shouldThrowOnIncludingTimeSeriesWithNegativeCount", async function () {
        const session = store.openSession();

        await assertThrows(async () => {
            await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i
                    .includeDocuments("company")
                    .includeAllTimeSeries("Last", -1024)
            })
        }, err => {
            assertThat(err.name)
                .isEqualTo("InvalidArgumentException");
            assertThat(err.message)
                .startsWith("Count have to be positive.");
        });
    });

    it("canLoadAsyncWithInclude_ArrayOfTimeSeriesLastRangeByTime", () => canLoadAsyncWithInclude_ArrayOfTimeSeriesLastRange(store, true));

    it("canLoadAsyncWithInclude_ArrayOfTimeSeriesLastRangeByCount", () => canLoadAsyncWithInclude_ArrayOfTimeSeriesLastRange(store, false));
});

async function canLoadAsyncWithInclude_ArrayOfTimeSeriesLastRange(store: IDocumentStore, byTime: boolean) {

    const baseline = byTime ? moment() : moment().startOf("day");

    {
        const session = store.openSession();
        const company = new Company();
        company.name = "HR";
        await session.store(company, "companies/1-A");

        const order = new Order();
        order.company = "companies/1-A";
        await session.store(order, "orders/1-A");

        const tsf = session.timeSeriesFor("orders/1-A", "heartrate");
        tsf.append(baseline.toDate(), 67, "watches/apple");
        tsf.append(baseline.clone().add(-5, "minutes").toDate(), 64, "watches/apple");
        tsf.append(baseline.clone().add(-10, "minutes").toDate(), 65, "watches/fitbit");

        const tsf2 = session.timeSeriesFor("orders/1-A", "speedrate");
        tsf2.append(baseline.clone().add(-15, "minutes").toDate(), 6, "watches/bitfit");
        tsf2.append(baseline.clone().add(-10, "minutes").toDate(), 7, "watches/bitfit");
        tsf2.append(baseline.clone().add(-9, "minutes").toDate(), 7, "watches/bitfit");
        tsf2.append(baseline.clone().add(-8, "minutes").toDate(), 6, "watches/bitfit");

        await session.saveChanges();
    }

    {
        const session = store.openSession();
        let order: Order;

        if (byTime) {
            order = await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i
                    .includeDocuments("company")
                    .includeTimeSeries(["heartrate", "speedrate"], "Last", TimeValue.ofMinutes(10))
            });
        } else {
            order = await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i
                    .includeDocuments("company")
                    .includeTimeSeries(["heartrate", "speedrate"], "Last", 3)
            });
        }

        assertThat(session.advanced.numberOfRequests)
            .isEqualTo(1);

        // should not go to server
        const company = await session.load(order.company, Company);

        assertThat(session.advanced.numberOfRequests)
            .isEqualTo(1);
        assertThat(company.name)
            .isEqualTo("HR");

        // should not go to server
        const heartrateValues = await session.timeSeriesFor(order, "heartrate")
            .get(baseline.clone().add(-10, "minutes").toDate(), null);

        assertThat(session.advanced.numberOfRequests)
            .isEqualTo(1);
        assertThat(heartrateValues)
            .hasSize(3);

        assertThat(heartrateValues[0].values)
            .hasSize(1);
        assertThat(heartrateValues[0].values[0])
            .isEqualTo(65);
        assertThat(heartrateValues[0].tag)
            .isEqualTo("watches/fitbit");
        assertThat(heartrateValues[0].timestamp.getTime())
            .isEqualTo(baseline.clone().add(-10, "minutes").toDate().getTime());

        assertThat(heartrateValues[1].values)
            .hasSize(1);
        assertThat(heartrateValues[1].values[0])
            .isEqualTo(64);
        assertThat(heartrateValues[1].tag)
            .isEqualTo("watches/apple");
        assertThat(heartrateValues[1].timestamp.getTime())
            .isEqualTo(baseline.clone().add(-5, "minutes").toDate().getTime());

        assertThat(heartrateValues[2].values)
            .hasSize(1);
        assertThat(heartrateValues[2].values[0])
            .isEqualTo(67);
        assertThat(heartrateValues[2].tag)
            .isEqualTo("watches/apple");
        assertThat(heartrateValues[2].timestamp.getTime())
            .isEqualTo(baseline.toDate().getTime());

        // should not go to server
        const speedrateValues = await session.timeSeriesFor(order, "speedrate")
            .get(baseline.clone().add(-10, "minutes").toDate(), null);

        assertThat(session.advanced.numberOfRequests)
            .isEqualTo(1);
        assertThat(speedrateValues)
            .hasSize(3);

        assertThat(speedrateValues[0].values)
            .hasSize(1);
        assertThat(speedrateValues[0].values[0])
            .isEqualTo(7);
        assertThat(speedrateValues[0].tag)
            .isEqualTo("watches/bitfit");
        assertThat(speedrateValues[0].timestamp.getTime())
            .isEqualTo(baseline.clone().add(-10, "minutes").toDate().getTime());

        assertThat(speedrateValues[1].values)
            .hasSize(1);
        assertThat(speedrateValues[1].values[0])
            .isEqualTo(7);
        assertThat(speedrateValues[1].tag)
            .isEqualTo("watches/bitfit");
        assertThat(speedrateValues[1].timestamp.getTime())
            .isEqualTo(baseline.clone().add(-9, "minutes").toDate().getTime());

        assertThat(speedrateValues[2].values)
            .hasSize(1);
        assertThat(speedrateValues[2].values[0])
            .isEqualTo(6);
        assertThat(speedrateValues[2].tag)
            .isEqualTo("watches/bitfit");
        assertThat(speedrateValues[2].timestamp.getTime())
            .isEqualTo(baseline.clone().add(-8, "minutes").toDate().getTime());
    }
}

class User {
    public name: string;
    public worksAt: string;
    public id: string;
}