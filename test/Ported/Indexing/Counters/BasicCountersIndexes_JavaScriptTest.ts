import { GetTermsOperation, IDocumentStore } from "../../../../src";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import { AbstractRawJavaScriptCountersIndexCreationTask } from "../../../../src/Documents/Indexes/Counters/AbstractRawJavaScriptCountersIndexCreationTask";
import { Address, Company, User } from "../../../Assets/Entities";
import { assertThat } from "../../../Utils/AssertExtensions";

describe("BasicCountersIndexes_JavaScript", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("basicMapIndex", async () => {
        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");
            session.countersFor(company).increment("heartRate", 7);

            await session.saveChanges();
        }

        const timeSeriesIndex = new MyCounterIndex();
        const indexDefinition = timeSeriesIndex.createIndexDefinition();

        await timeSeriesIndex.execute(store);

        await testContext.waitForIndexing(store);

        let terms = await store.maintenance.send(new GetTermsOperation("MyCounterIndex", "heartBeat", null));
        assertThat(terms)
            .hasSize(1);
        assertThat(terms)
            .contains("7");

        terms = await store.maintenance.send(new GetTermsOperation("MyCounterIndex", "user", null));
        assertThat(terms)
            .hasSize(1)
            .contains("companies/1");

        terms = await store.maintenance.send(new GetTermsOperation("MyCounterIndex", "name", null));
        assertThat(terms)
            .hasSize(1)
            .contains("heartrate");

        {
            const session = store.openSession();
            const company1 = await session.load("companies/1", Company);
            session.countersFor(company1)
                .increment("heartRate", 3);

            const company2 = new Company();
            await session.store(company2, "companies/2");
            session.countersFor(company2)
                .increment("heartRate", 4);

            const company3 = new Company();
            await session.store(company3, "companies/3");
            session.countersFor(company3)
                .increment("heartRate", 6);

            const company999 = new Company();
            await session.store(company999, "companies/999");
            session.countersFor(company999)
                .increment("heartRate_Different", 999);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        terms = await store.maintenance.send(new GetTermsOperation("MyCounterIndex", "heartBeat", null));
        assertThat(terms)
            .hasSize(3)
            .contains("10")
            .contains("4")
            .contains("6");

        terms = await store.maintenance.send(new GetTermsOperation("MyCounterIndex", "user", null));
        assertThat(terms)
            .hasSize(3)
            .contains("companies/1")
            .contains("companies/2")
            .contains("companies/3");

        terms = await store.maintenance.send(new GetTermsOperation("MyCounterIndex", "name", null));
        assertThat(terms)
            .hasSize(1)
            .contains("heartrate");

        // skipped rest of the test
    });

    it("basicMapReduceIndexWithLoad", async function () {
        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                const address = new Address();
                address.city = "NY";
                await session.store(address, "addresses/" + i);

                const user = new User();
                user.addressId = address.id;
                await session.store(user, "users/" + i);

                session.countersFor(user)
                    .increment("heartRate", 180 + i);
            }

            await session.saveChanges();
        }

        const timeSeriesIndex = new AverageHeartRate_WithLoad();
        const indexName = timeSeriesIndex.getIndexName();
        const indexDefinition = timeSeriesIndex.createIndexDefinition();

        await timeSeriesIndex.execute(store);

        await testContext.waitForIndexing(store);

        let terms = await store.maintenance.send(new GetTermsOperation(indexName, "heartBeat", null));
        assertThat(terms)
            .hasSize(1)
            .contains("184.5");

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "count", null));
        assertThat(terms)
            .hasSize(1)
            .contains("10");

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "city", null));
        assertThat(terms)
            .hasSize(1)
            .contains("ny");
    });

    it("canMapAllCountersFromCollection", async function () {
        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");

            session.countersFor(company)
                .increment("heartRate", 7);
            session.countersFor(company)
                .increment("likes", 3);

            await session.saveChanges();
        }

        const timeSeriesIndex = new MyCounterIndex_AllCounters();
        const indexName = timeSeriesIndex.getIndexName();
        const indexDefinition = timeSeriesIndex.createIndexDefinition();

        await timeSeriesIndex.execute(store);

        await testContext.waitForIndexing(store);

        let terms = await store.maintenance.send(new GetTermsOperation(indexName, "heartBeat", null));
        assertThat(terms)
            .hasSize(2)
            .contains("7")
            .contains("3");

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "user", null));
        assertThat(terms)
            .hasSize(1)
            .contains("companies/1");

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "name", null));
        assertThat(terms)
            .hasSize(2)
            .contains("heartrate")
            .contains("likes");
    });

    it("basicMultiMapIndex", async function () {
        const timeSeriesIndex = new MyMultiMapCounterIndex();

        await timeSeriesIndex.execute(store);

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company);

            session.countersFor(company)
                .increment("heartRate", 3);
            session.countersFor(company)
                .increment("heartRate2", 5);

            const user = new User();
            await session.store(user);
            session.countersFor(user)
                .increment("heartRate", 2);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const results = await session.query(MyMultiMapCounterIndexResult, MyMultiMapCounterIndex)
                .all();

            assertThat(results)
                .hasSize(3);
        }
    });

    it("counterNamesFor", async function () {
        const index = new Companies_ByCounterNames();
        await index.execute(store);

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        let terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "name", null));
        assertThat(terms)
            .hasSize(0);

        terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names_IsArray", null));
        assertThat(terms)
            .hasSize(1)
            .contains("true");

        {
            const session = store.openSession();
            const company = await session.load("companies/1", Company);

            session.countersFor(company)
                .increment("heartRate", 3);
            session.countersFor(company)
                .increment("heartRate2", 7);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names", null));
        assertThat(terms)
            .hasSize(2)
            .contains("heartrate")
            .contains("heartrate2");

        terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names_IsArray", null));
        assertThat(terms)
            .hasSize(1)
            .contains("true");
    });
});

class MyCounterIndex extends AbstractRawJavaScriptCountersIndexCreationTask {
    public constructor() {
        super();

        this.maps.add(
            "counters.map('Companies', 'HeartRate', function (counter) {\n" +
            "return {\n" +
            "    heartBeat: counter.Value,\n" +
            "    name: counter.Name,\n" +
            "    user: counter.DocumentId\n" +
            "};\n" +
            "})"
        );
    }
}


class AverageHeartRate_WithLoad extends AbstractRawJavaScriptCountersIndexCreationTask {

    constructor() {
        super();

        this.maps.add("counters.map('Users', 'heartRate', function (counter) {\n" +
            "var user = load(counter.DocumentId, 'Users');\n" +
            "var address = load(user.addressId, 'Addresses');\n" +
            "return {\n" +
            "    heartBeat: counter.Value,\n" +
            "    count: 1,\n" +
            "    city: address.city\n" +
            "};\n" +
            "})");

        this.reduce = "groupBy(r => ({ city: r.city }))\n" +
            " .aggregate(g => ({\n" +
            "     heartBeat: g.values.reduce((total, val) => val.heartBeat + total, 0) / g.values.reduce((total, val) => val.count + total, 0),\n" +
            "     city: g.key.city,\n" +
            "     count: g.values.reduce((total, val) => val.count + total, 0)\n" +
            " }))";
    }
}

class AverageHeartRate_WithLoadResult {
    public heartBeat: number;
    public city: string;
    public count: number;
}

class MyCounterIndex_AllCounters extends AbstractRawJavaScriptCountersIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("counters.map('Companies', function (counter) {\n" +
            "return {\n" +
            "    heartBeat: counter.Value,\n" +
            "    name: counter.Name,\n" +
            "    user: counter.DocumentId\n" +
            "};\n" +
            "})");
    }
}

class MyMultiMapCounterIndex extends AbstractRawJavaScriptCountersIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("counters.map('Companies', 'heartRate', function (counter) {\n" +
            "return {\n" +
            "    heartBeat: counter.Value,\n" +
            "    name: counter.Name,\n" +
            "    user: counter.DocumentId\n" +
            "};\n" +
            "})");

        this.maps.add("counters.map('Companies', 'heartRate2', function (counter) {\n" +
            "return {\n" +
            "    heartBeat: counter.Value,\n" +
            "    name: counter.Name,\n" +
            "    user: counter.DocumentId\n" +
            "};\n" +
            "})");

        this.maps.add("counters.map('Users', 'heartRate', function (counter) {\n" +
            "return {\n" +
            "    heartBeat: counter.Value,\n" +
            "    name: counter.Name,\n" +
            "    user: counter.DocumentId\n" +
            "};\n" +
            "})");
    }
}

class MyMultiMapCounterIndexResult {
    public heartBeat: number;
    public name: string;
    public user: string;
}

class Companies_ByCounterNames extends AbstractRawJavaScriptCountersIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("map('Companies', function (company) {\n" +
            "return ({\n" +
            "    names: counterNamesFor(company)\n" +
            "})\n" +
            "})");
    }
}
