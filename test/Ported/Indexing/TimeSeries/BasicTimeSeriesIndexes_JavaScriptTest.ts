import { AbstractRawJavaScriptIndexCreationTask, GetTermsOperation, IDocumentStore } from "../../../../src";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import moment = require("moment");
import { AbstractRawJavaScriptTimeSeriesIndexCreationTask } from "../../../../src/Documents/Indexes/TimeSeries/AbstractRawJavaScriptTimeSeriesIndexCreationTask";
import { Employee } from "../../../Assets/Orders";
import { Company, User, Address } from "../../../Assets/Entities";
import { assertThat } from "../../../Utils/AssertExtensions";
import { RavenTestHelper } from "../../../Utils/RavenTestHelper";

describe("BasicTimeSeriesIndexes_JavaScript", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("basicMapIndexWithLoad", async () => {
        const now1 = new Date();
        const now2 = moment().add(1, "second").toDate();

        {
            const session = store.openSession();
            const employee = new Employee();
            employee.firstName = "John";

            await session.store(employee, "employees/1");

            const company = new Company();
            await session.store(company, "companies/1");

            session.timeSeriesFor(company, "HeartRate")
                .append(now1, 7.0, employee.id);

            const company2 = new Company();
            await session.store(company2, "companies/11");

            session.timeSeriesFor(company2, "HeartRate")
                .append(now1, 11, employee.id);

            await session.saveChanges();
        }

        const timeSeriesIndex = new MyTsIndex_Load();
        const indexName = timeSeriesIndex.getIndexName();
        const indexDefinition = timeSeriesIndex.createIndexDefinition();

        await timeSeriesIndex.execute(store);

        await testContext.waitForIndexing(store);

        let terms = await store.maintenance.send(new GetTermsOperation(indexName, "employee", null));
        assertThat(terms)
            .hasSize(1)
            .contains("john");

        {
            const session = store.openSession();
            const employee = await session.load("employees/1", Employee);
            employee.firstName = "Bob";
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "employee", null));
        assertThat(terms)
            .hasSize(1)
            .contains("bob");

        {
            const session = store.openSession();
            await session.delete("employees/1");
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "employee", null));

        assertThat(terms)
            .hasSize(0);
    });

    it("basicMapReduceIndexWithLoad", async function () {
        const today = testContext.utcToday();


        {
            const session = store.openSession();
            const address = new Address();
            address.city = "NY";

            await session.store(address, "addresses/1");

            const user = new User();
            user.addressId = address.id;

            await session.store(user, "users/1");

            for (let i = 0; i < 10; i++) {
                session.timeSeriesFor(user, "heartRate")
                    .append(today.clone().add(i, "hours").toDate(), 180 + i, address.id);
            }

            await session.saveChanges();
        }

        const timeSeriesIndex = new AverageHeartRateDaily_ByDateAndCity();
        const indexName = timeSeriesIndex.getIndexName();
        const indexDefinition = timeSeriesIndex.createIndexDefinition();

        await timeSeriesIndex.execute(store);

        await testContext.waitForIndexing(store);

        let terms = await store.maintenance.send(new GetTermsOperation(indexName, "heartBeat", null));
        assertThat(terms)
            .hasSize(1)
            .contains("184.5");

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "date", null));
        assertThat(terms)
            .hasSize(1);

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "city", null));
        assertThat(terms)
            .hasSize(1)
            .contains("ny");

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "count", null));
        assertThat(terms)
            .hasSize(1)
            .contains("10");

        {
            const session = store.openSession();
            const address = await session.load("addresses/1", Address);
            address.city = "LA";
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        terms = await store.maintenance.send(new GetTermsOperation(indexName, "city", null));
        assertThat(terms)
            .hasSize(1)
            .contains("la");
    });

    it("canMapAllTimeSeriesFromCollection", async function () {
        const now1 = new Date();
        const now2 = moment().add(1, "seconds").toDate();

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");
            session.timeSeriesFor(company, "heartRate")
                .append(now1, 7.0, "tag1");
            session.timeSeriesFor(company, "likes")
                .append(now1, 3.0, "tag2");

            await session.saveChanges();
        }

        await new MyTsIndex_AllTimeSeries().execute(store);

        await testContext.waitForIndexing(store);

        const terms = await store.maintenance.send(new GetTermsOperation("MyTsIndex/AllTimeSeries", "heartBeat", null));
        assertThat(terms)
            .hasSize(2)
            .contains("7")
            .contains("3");
    });

    it("basicMultiMapIndex", async function () {
        const now = testContext.utcToday();

        const timeSeriesIndex = new MyMultiMapTsIndex();
        await timeSeriesIndex.execute(store);

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company);

            session.timeSeriesFor(company, "heartRate")
                .append(now.toDate(), 2.5, "tag1");
            session.timeSeriesFor(company, "heartRate2")
                .append(now.toDate(), 3.5, "tag2");

            const user = new User();
            await session.store(user);
            session.timeSeriesFor(user, "heartRAte")
                .append(now.toDate(), 4.5, "tag3");

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const results = await session.query(MyMultiMapTsIndexResult, MyMultiMapTsIndex)
                .all();

            assertThat(results)
                .hasSize(3);
        }
    });

    it("timeSeriesNamesFor", async function () {
        const now = testContext.utcToday();

        {
            const index = new Companies_ByTimeSeriesNames();
            await index.execute(store);

            {
                const session = store.openSession();
                const company = new Company();
                await session.store(company, "companies/1");

                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            await RavenTestHelper.assertNoIndexErrors(store);

            let terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names", null));
            assertThat(terms)
                .hasSize(0);

            terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names_IsArray", null));
            assertThat(terms)
                .hasSize(1)
                .contains("true");

            {
                const session = store.openSession();
                const company = await session.load("companies/1", Company);
                session.timeSeriesFor(company, "heartRate")
                    .append(now.toDate(), 2.5, "tag1");
                session.timeSeriesFor(company, "heartRate2")
                    .append(now.toDate(), 3.5, "tag2");

                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            await RavenTestHelper.assertNoIndexErrors(store);

            terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names", null));
            assertThat(terms)
                .hasSize(2)
                .contains("heartrate")
                .contains("heartrate2");

            terms = await store.maintenance.send(new GetTermsOperation(index.getIndexName(), "names_IsArray", null));
            assertThat(terms)
                .hasSize(1)
                .contains("true");
        }
    });
});

class MyTsIndex_AllTimeSeries extends AbstractRawJavaScriptTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("timeSeries.map('Companies', function (ts) {\n" +
            " return ts.Entries.map(entry => ({\n" +
            "        heartBeat: entry.Values[0],\n" +
            "        date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        user: ts.documentId\n" +
            "    }));\n" +
            " })");
    }
}

class MyTsIndex_Load extends AbstractRawJavaScriptTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("timeSeries.map('Companies', 'HeartRate', function (ts) {\n" +
            "return ts.Entries.map(entry => ({\n" +
            "        heartBeat: entry.Value,\n" +
            "        date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        user: ts.DocumentId,\n" +
            "        employee: load(entry.Tag, 'Employees').firstName\n" +
            "    }));\n" +
            "})");
    }
}

class AverageHeartRateDaily_ByDateAndCityResult {
    public heartBeat: number;
    public date: string;
    public city: string;
    public count: number;
}

class AverageHeartRateDaily_ByDateAndCity extends AbstractRawJavaScriptTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("timeSeries.map('Users', 'heartRate', function (ts) {\n" +
            "return ts.Entries.map(entry => ({\n" +
            "        heartBeat: entry.Value,\n" +
            "        date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        city: load(entry.Tag, 'Addresses').city,\n" +
            "        count: 1\n" +
            "    }));\n" +
            "})");

        this.reduce = "groupBy(r => ({ date: r.date, city: r.city }))\n" +
            " .aggregate(g => ({\n" +
            "     heartBeat: g.values.reduce((total, val) => val.heartBeat + total, 0) / g.values.reduce((total, val) => val.count + total, 0),\n" +
            "     date: g.key.date,\n" +
            "     city: g.key.city\n" +
            "     count: g.values.reduce((total, val) => val.count + total, 0)\n" +
            " }))";
    }
}

class MyMultiMapTsIndexResult {
    public heartBeat: number;
    public date: string;
    public user: string;
}

class MyMultiMapTsIndex extends AbstractRawJavaScriptTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("timeSeries.map('Companies', 'HeartRate', function (ts) {\n" +
            "return ts.Entries.map(entry => ({\n" +
            "        HeartBeat: entry.Values[0],\n" +
            "        Date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        User: ts.DocumentId\n" +
            "    }));\n" +
            "})");

        this.maps.add("timeSeries.map('Companies', 'HeartRate2', function (ts) {\n" +
            "return ts.Entries.map(entry => ({\n" +
            "        HeartBeat: entry.Values[0],\n" +
            "        Date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        User: ts.DocumentId\n" +
            "    }));\n" +
            "})");

        this.maps.add("timeSeries.map('Users', 'HeartRate', function (ts) {\n" +
            "return ts.Entries.map(entry => ({\n" +
            "        HeartBeat: entry.Values[0],\n" +
            "        Date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        User: ts.DocumentId\n" +
            "    }));\n" +
            "})");
    }
}

class Companies_ByTimeSeriesNames extends AbstractRawJavaScriptIndexCreationTask {
    public constructor() {
        super();

        this.maps.add("map('Companies', function (company) {\n" +
            "return ({\n" +
            "    names: timeSeriesNamesFor(company)\n" +
            "})\n" +
            "})");
    }
}
