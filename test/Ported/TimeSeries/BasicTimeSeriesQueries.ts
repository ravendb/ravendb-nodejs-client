import {
    DocumentSession,
    IDocumentStore,
    PutIndexesOperation,
    QueryStatistics,
    StartIndexingOperation,
    StopIndexingOperation,
    TimeSeriesIndexDefinition
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { Company } from "../../Assets/Orders.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { addDays, addHours, addSeconds } from "date-fns";

interface TsMapIndexResult {
    HeartBeat: number;
    Date: string;
    User: string;
}

interface TsMapReduceIndexResult extends TsMapIndexResult {
    Count: number;
}

describe("BasicTimeSeriesQueries", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const stopIndexing = () => store.maintenance.send(new StopIndexingOperation());

    async function startIndexingAndWait() {
        await store.maintenance.send(new StartIndexingOperation());
        await testContext.waitForIndexing(store);
    }

    async function query<T extends object>(indexName: string, waitForNonStaleResults = false) {
        const session = store.openSession() as DocumentSession;
        let stats: QueryStatistics;
        const query = session.query<T>({ indexName }).statistics(s => stats = s);
        const results = await (waitForNonStaleResults ? query.waitForNonStaleResults() : query).all();
        return { results, stats, session };
    }

    function assertNotTracking(session: DocumentSession) {
        assertThat(session.documentsById.getCount()).isEqualTo(0);
        assertThat(session.documentsByEntity.size).isEqualTo(0);
    }

    const asUtc = (date: string) => date.endsWith("Z") ? date : date + "Z";
    const dates = (results: TsMapIndexResult[]) => results.map(x => new Date(asUtc(x.Date)).getTime());

    function assertContains(results: TsMapIndexResult[], heartBeat: number, date: Date) {
        assertThat(results.map(x => x.HeartBeat)).contains(heartBeat);
        assertThat(dates(results)).contains(date.getTime());
    }

    it("basic map index query", async () => {
        const now1 = testContext.utcToday();
        const now2 = addSeconds(now1, 1);

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");
            session.timeSeriesFor(company, "HeartRate").append(now1, 7, "tag");
            await session.saveChanges();
        }

        await stopIndexing();

        await store.maintenance.send(new PutIndexesOperation(Object.assign(new TimeSeriesIndexDefinition(), {
            name: "MyTsIndex",
            maps: new Set([
                "from ts in timeSeries.Companies.HeartRate " +
                "from entry in ts.Entries " +
                "select new { " +
                "   HeartBeat = entry.Values[0], " +
                "   Date = entry.Timestamp.Date, " +
                "   User = ts.DocumentId.ToString() " +
                "}"
            ])
        })));

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(0);
        }

        await startIndexingAndWait();

        {
            const { results, stats, session } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(1);
            assertThat(results[0].HeartBeat).isEqualTo(7);
            assertThat(dates(results)[0]).isEqualTo(now1.getTime());
            assertThat(results[0].User).isEqualTo("companies/1");
            assertNotTracking(session);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            const company = await session.load("companies/1", Company);
            session.timeSeriesFor(company, "HeartRate").append(now2, [3], "tag");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(1);
            assertThat(results[0].HeartBeat).isEqualTo(7);
            assertThat(dates(results)[0]).isEqualTo(now1.getTime());
            assertThat(results[0].User).isEqualTo("companies/1");
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(2);
            assertContains(results, 7, now1);
            assertContains(results, 3, now1);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            const company = await session.load("companies/1", Company);
            session.timeSeriesFor(company, "HeartRate").deleteAt(now2);
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(2);
            assertContains(results, 7, now1);
            assertContains(results, 3, now1);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(1);
            assertContains(results, 7, now1);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            await session.delete("companies/1");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(1);
            assertContains(results, 7, now1);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex");
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(0);
        }

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/2");
            session.timeSeriesFor(company, "HeartRate").append(now1, [9], "tag");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex", true);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(1);
            assertContains(results, 9, now1);
            assertThat(results.map(x => x.User)).contains("companies/2");
        }

        {
            const session = store.openSession();
            await session.delete("companies/2");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapIndexResult>("MyTsIndex", true);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(0);
        }
    });

    it("basic map reduce index query", async () => {
        const today = testContext.utcToday();
        const tomorrow = addDays(today, 1);

        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/1");
            for (let i = 0; i < 10; i++) {
                session.timeSeriesFor(user, "HeartRate").append(addHours(today, i), [180 + i], "abc");
            }
            await session.saveChanges();
        }

        await stopIndexing();

        const indexName = "AverageHeartRateDaily/ByDateAndUser";

        await store.maintenance.send(new PutIndexesOperation(Object.assign(new TimeSeriesIndexDefinition(), {
            name: indexName,
            maps: new Set([
                "from ts in timeSeries.Users.HeartRate " +
                "from entry in ts.Entries " +
                "select new { " +
                "   HeartBeat = entry.Value, " +
                "   Date = new DateTime(entry.Timestamp.Date.Year, entry.Timestamp.Date.Month, entry.Timestamp.Date.Day), " +
                "   User = ts.DocumentId, " +
                "   Count = 1" +
                "}"
            ]),
            reduce: "from r in results " +
                "group r by new { r.Date, r.User } into g " +
                "let sumHeartBeat = g.Sum(x => x.HeartBeat) " +
                "let sumCount = g.Sum(x => x.Count) " +
                "select new {" +
                "  HeartBeat = sumHeartBeat / sumCount, " +
                "  Date = g.Key.Date," +
                "  User = g.Key.User, " +
                "  Count = sumCount" +
                "}"
        })));

        function assertDay(results: TsMapReduceIndexResult[], heartBeat: number, date: Date, count: number) {
            assertContains(results, heartBeat, date);
            assertThat(results.map(x => x.Count)).contains(count);
        }

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(0);
        }

        await startIndexingAndWait();

        {
            const { results, stats, session } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(1);
            assertDay(results, 184.5, today, 10);
            assertThat(results.map(x => x.User)).contains("users/1");
            assertNotTracking(session);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            const user = await session.load("users/1", User);
            for (let i = 0; i < 20; i++) {
                session.timeSeriesFor(user, "HeartRate").append(addHours(tomorrow, i), [200 + i], "abc");
            }
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(1);
            assertDay(results, 184.5, today, 10);
            assertThat(results.map(x => x.User)).contains("users/1");
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(2);
            assertDay(results, 184.5, today, 10);
            assertDay(results, 209.5, tomorrow, 20);
            assertThat(results.map(x => x.User === "users/1")).hasSize(2);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            const user = await session.load("users/1", User);
            const tsf = session.timeSeriesFor(user, "HeartRate");
            for (let i = 0; i < 10; i++) {
                tsf.deleteAt(addHours(today, i));
                tsf.deleteAt(addHours(tomorrow, i));
            }
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(2);
            assertDay(results, 184.5, today, 10);
            assertDay(results, 209.5, tomorrow, 20);
            assertThat(results.map(x => x.User === "users/1")).hasSize(2);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(1);
            assertDay(results, 214.5, tomorrow, 10);
            assertThat(results.map(x => x.User === "users/1")).hasSize(1);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            await session.delete("users/1");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(1);
            assertDay(results, 214.5, tomorrow, 10);
            assertThat(results.map(x => x.User === "users/1")).hasSize(1);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<TsMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(0);
        }
    });
});
