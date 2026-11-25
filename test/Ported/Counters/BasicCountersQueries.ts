import {
    CountersIndexDefinition,
    DocumentSession,
    IDocumentStore,
    PutIndexesOperation,
    QueryStatistics,
    StartIndexingOperation,
    StopIndexingOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { Company } from "../../Assets/Orders.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

interface CounterMapIndexResult {
    HeartBeat: number;
    Name: string;
    User: string;
}

interface CounterMapReduceIndexResult {
    HeartBeat: number;
    Name: string;
    Count: number;
}

describe("BasicCountersQueries", function () {
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

    function assertHeartRates(results: CounterMapIndexResult[], expected: [number, string][]) {
        assertThat(results).hasSize(expected.length);
        for (const [heartBeat, user] of expected) {
            assertThat(results.map(x => x.HeartBeat)).contains(heartBeat);
            assertThat(results.map(x => x.User)).contains(user);
        }
        assertThat(results).allMatch(x => x.Name === "HeartRate");
    }

    it("basic map index query", async () => {
        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");
            session.countersFor(company).increment("HeartRate", 7);
            await session.saveChanges();
        }

        await stopIndexing();

        await store.maintenance.send(new PutIndexesOperation(Object.assign(new CountersIndexDefinition(), {
            name: "MyCounterIndex",
            maps: new Set([
                "from counter in counters.Companies.HeartRate " +
                "select new { " +
                "   HeartBeat = counter.Value, " +
                "   Name = counter.Name," +
                "   User = counter.DocumentId " +
                "}"
            ])
        })));

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(0);
        }

        await startIndexingAndWait();

        {
            const { results, stats, session } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(1);
            assertThat(results[0].HeartBeat).isEqualTo(7);
            assertThat(results[0].Name).isEqualTo("HeartRate");
            assertThat(results[0].User).isEqualTo("companies/1");
            assertNotTracking(session);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            const company1 = await session.load("companies/1", Company);
            session.countersFor(company1).increment("HeartRate", 3);

            const company2 = new Company();
            await session.store(company2, "companies/2");
            session.countersFor(company2).increment("HeartRate", 4);

            const company3 = new Company();
            await session.store(company3, "companies/3");
            session.countersFor(company3).increment("HeartRate", 6);

            const company999 = new Company();
            await session.store(company999, "companies/999");
            session.countersFor(company999).increment("HeartRate_Different", 999);

            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(1);
            assertThat(results[0].HeartBeat).isEqualTo(7);
            assertThat(results[0].Name).isEqualTo("HeartRate");
            assertThat(results[0].User).isEqualTo("companies/1");
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isFalse();
            assertHeartRates(results, [[10, "companies/1"], [4, "companies/2"], [6, "companies/3"]]);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            const company = await session.load("companies/1", Company);
            session.countersFor(company).delete("HeartRate");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isTrue();
            assertHeartRates(results, [[10, "companies/1"], [4, "companies/2"], [6, "companies/3"]]);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isFalse();
            assertHeartRates(results, [[4, "companies/2"], [6, "companies/3"]]);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            await session.delete("companies/2");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isTrue();
            assertHeartRates(results, [[4, "companies/2"], [6, "companies/3"]]);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex");
            assertThat(stats.isStale).isFalse();
            assertHeartRates(results, [[6, "companies/3"]]);
        }

        {
            const session = store.openSession();
            await session.delete("companies/1");
            await session.delete("companies/3");
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex", true);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(0);
        }

        {
            const session = store.openSession();
            const company = Object.assign(new Company(), { name: "HR" });
            await session.store(company, "companies/4");
            session.countersFor(company).increment("HeartRate", 5);
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapIndexResult>("MyCounterIndex", true);
            assertThat(stats.isStale).isFalse();
            assertHeartRates(results, [[5, "companies/4"]]);
        }
    });

    it("basic map reduce index query", async () => {
        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                const user = new User();
                await session.store(user, `users/${i}`);
                session.countersFor(user).increment("HeartRate", 180 + i);
            }
            await session.saveChanges();
        }

        await stopIndexing();

        const indexName = "AverageHeartRate";

        await store.maintenance.send(new PutIndexesOperation(Object.assign(new CountersIndexDefinition(), {
            name: indexName,
            maps: new Set([
                "from counter in counters.Users.HeartRate " +
                "select new { " +
                "   HeartBeat = counter.Value, " +
                "   Name = counter.Name, " +
                "   Count = 1" +
                "}"
            ]),
            reduce: "from r in results " +
                "group r by r.Name into g " +
                "let sumHeartBeat = g.Sum(x => x.HeartBeat) " +
                "let sumCount = g.Sum(x => x.Count) " +
                "select new {" +
                "  HeartBeat = sumHeartBeat / sumCount, " +
                "  Name = g.Key, " +
                "  Count = sumCount" +
                "}"
        })));

        function assertAverage(results: CounterMapReduceIndexResult[], heartBeat: number, count: number) {
            assertThat(results).hasSize(1);
            assertThat(results[0].HeartBeat).isEqualTo(heartBeat);
            assertThat(results[0].Name).isEqualTo("HeartRate");
            assertThat(results[0].Count).isEqualTo(count);
        }

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertThat(results).hasSize(0);
        }

        await startIndexingAndWait();

        {
            const { results, stats, session } = await query<CounterMapReduceIndexResult>(indexName, true);
            assertThat(stats.isStale).isFalse();
            assertAverage(results, 184.5, 10);
            assertNotTracking(session);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            for (let i = 10; i < 20; i++) {
                const user = new User();
                await session.store(user, `users/${i}`);
                session.countersFor(user).increment("HeartRate", 200 + i);
            }
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertAverage(results, 184.5, 10);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertAverage(results, 199.5, 20);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                const user = await session.load(`users/${i}`, User);
                session.countersFor(user).delete("HeartRate");
            }
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertAverage(results, 199.5, 20);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertAverage(results, 214.5, 10);
        }

        await stopIndexing();

        {
            const session = store.openSession();
            for (let i = 0; i < 20; i++) {
                await session.delete(`users/${i}`);
            }
            await session.saveChanges();
        }

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isTrue();
            assertAverage(results, 214.5, 10);
        }

        await startIndexingAndWait();

        {
            const { results, stats } = await query<CounterMapReduceIndexResult>(indexName);
            assertThat(stats.isStale).isFalse();
            assertThat(results).hasSize(0);
        }
    });
});
