import { AbstractJavaScriptIndexCreationTask, IDocumentStore, QueryStatistics, SessionOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Address, Company, Employee } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_14006", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("compareExchangeValueTrackingInSession", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);

            const company = new Company();
            company.id = "companies/1";
            company.externalId = "companies/cf";
            company.name = "CF";

            await session.store(company);

            const numberOfRequests = session.advanced.numberOfRequests;

            const address = new Address();
            address.city = "Torun";
            session.advanced.clusterTransaction.createCompareExchangeValue(company.externalId, address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            const value1 = await session.advanced.clusterTransaction.getCompareExchangeValue(company.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            assertThat(value1.value)
                .isEqualTo(address);
            assertThat(value1.key)
                .isEqualTo(company.externalId);
            assertThat(value1.index)
                .isEqualTo(0);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            assertThat(value1.value)
                .isEqualTo(address);
            assertThat(value1.key)
                .isEqualTo(company.externalId);
            assertThat(value1.index)
                .isGreaterThan(0);

            const value2 = await session.advanced.clusterTransaction.getCompareExchangeValue(company.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            assertThat(value2)
                .isSameAs(value1);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            session.advanced.clear();

            const value3 = await session.advanced.clusterTransaction.getCompareExchangeValue(company.externalId, Address);
            assertThat(value3)
                .isNotSameAs(value2);
        }

        {
            const session = store.openSession(sessionOptions);
            const address = new Address();
            address.city = "Hadera";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/hr", address);

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const numberOfRequests = session.advanced.numberOfRequests;

            const value1 = await session.advanced.clusterTransaction.getCompareExchangeValue("companies/cf", Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            const value2 = await session.advanced.clusterTransaction.getCompareExchangeValue("companies/hr", Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 2);

            let values = await session.advanced.clusterTransaction.getCompareExchangeValues(["companies/cf", "companies/hr"], Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 2);

            assertThat(values)
                .hasSize(2);
            assertThat(values[value1.key])
                .isEqualTo(value1);
            assertThat(values[value2.key])
                .isEqualTo(value2);

            values = await session.advanced.clusterTransaction.getCompareExchangeValues<Address>(
                ["companies/cf", "companies/hr", "companies/hx"], Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 3);

            assertThat(values)
                .hasSize(3);

            assertThat(values[value1.key])
                .isSameAs(value1);
            assertThat(values[value2.key])
                .isSameAs(value2);

            const value3 = await session.advanced.clusterTransaction.getCompareExchangeValue("companies/hx", Address);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 3);

            assertThat(value3)
                .isNull();
            assertThat(values["companies/hx"])
                .isNull();

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 3);

            const address = new Address();
            address.city = "Bydgoszcz";

            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/hx", address);

            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 4);
        }
    });

    it("compareExchangeValueTrackingInSession_NoTracking", async () => {
        const company = new Company();
        company.id = "companies/1";
        company.externalId = "companies/cf";
        company.name = "CF";

        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            await session.store(company);

            const address = new Address();
            address.city = "Torun";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>(company.externalId, address);
            await session.saveChanges();
        }

        const sessionOptionsNoTracking: SessionOptions = {
            transactionMode: "ClusterWide",
            noTracking: true
        };

        {
            const session = store.openSession(sessionOptionsNoTracking);
            const numberOfRequests = session.advanced.numberOfRequests;

            const value1 = await session.advanced.clusterTransaction.getCompareExchangeValue(company.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            const value2 = await session.advanced.clusterTransaction.getCompareExchangeValue(company.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 2);

            assertThat(value2)
                .isNotSameAs(value1);

            const value3 = await session.advanced.clusterTransaction.getCompareExchangeValue(company.externalId, Address);
            assertThat(value3)
                .isNotSameAs(value2);
        }

        {
            const session = store.openSession(sessionOptionsNoTracking);
            const numberOfRequests = session.advanced.numberOfRequests;

            const value1 = session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>(company.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            const value2 = await session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>(company.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 2);

            assertThat(value2[company.externalId])
                .isNotSameAs(value1[company.externalId]);

            const value3 = await session.advanced.clusterTransaction.getCompareExchangeValues<Address>(company.externalId, Address);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 3);

            assertThat(value3[company.externalId])
                .isNotSameAs(value2[company.externalId]);
        }

        {
            const session = store.openSession(sessionOptionsNoTracking);
            const numberOfRequests = session.advanced.numberOfRequests;

            const value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>([company.externalId], Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            const value2 = await session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>([company.externalId], Address);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 2);

            assertThat(value2[company.externalId])
                .isNotSameAs(value1[company.externalId]);

            const value3 = await session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>([company.externalId], Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 3);

            assertThat(value3[company.externalId])
                .isNotSameAs(value2[company.externalId]);
        }
    });

    it("canUseCompareExchangeValueIncludesInLoad", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const employee = new Employee();
            employee.id = "employees/1";
            employee.notes = ["companies/cf", "companies/hr"];

            await session.store(employee);

            const company = new Company();
            company.id = "companies/1";
            company.externalId = "companies/cf";
            company.name = "CF";
            await session.store(company);

            const address1 = new Address();
            address1.city = "Torun";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/cf", address1);

            const address2 = new Address();
            address2.city = "Hadera";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/hr", address2);

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const company1 = await session.load<Company>("companies/1", {
                documentType: Company,
                includes: i => i.includeCompareExchangeValue("externalId")
            });

            const numberOfRequests = session.advanced.numberOfRequests;

            const value1 = await session.advanced.clusterTransaction.getCompareExchangeValue(company1.externalId, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            assertThat(value1)
                .isNotNull();
            assertThat(value1.index)
                .isGreaterThan(0);
            assertThat(value1.key)
                .isEqualTo(company1.externalId);
            assertThat(value1.value)
                .isNotNull();
            assertThat(value1.value.city)
                .isEqualTo("Torun");

            const company2 = await session.load<Company>("companies/1", {
                documentType: Company,
                includes: i => i.includeCompareExchangeValue("externalId")
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            assertThat(company2)
                .isSameAs(company1);

            const employee1 = await session.load<Employee>("employees/1", {
                documentType: Employee,
                includes: i => i.includeCompareExchangeValue("notes")
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            const value2 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(employee1.notes[0], Address);

            const value3 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(employee1.notes[1], Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            assertThat(value2)
                .isSameAs(value1);

            assertThat(value3)
                .isNotSameAs(value2);

            const values = await session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>(employee1.notes, Address);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests + 1);

            assertThat(values)
                .hasSize(2);

            assertThat(values[value2.key])
                .isSameAs(value2);
            assertThat(values[value3.key])
                .isSameAs(value3);
        }
    });

    it("canUseCompareExchangeValueIncludesInQueries_Dynamic", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const employee = new Employee();
            employee.id = "employees/1";
            employee.notes = ["companies/cf", "companies/hr"];
            await session.store(employee);

            const company = new Company();
            company.id = "companies/1";
            company.externalId = "companies/cf";
            company.name = "CF";
            await session.store(company);

            const address1 = new Address();
            address1.city = "Torun";
            session.advanced.clusterTransaction
                .createCompareExchangeValue<Address>("companies/cf", address1);

            const address2 = new Address();
            address2.city = "Hadera";
            session.advanced.clusterTransaction
                .createCompareExchangeValue<Address>("companies/hr", address2);

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            let queryStats: QueryStatistics;
            let companies = await session.query(Company)
                .statistics(s => queryStats = s)
                .include(b => b.includeCompareExchangeValue("externalId"))
                .all();

            assertThat(companies)
                .hasSize(1);

            assertThat(queryStats.durationInMs)
                .isGreaterThan(-1);

            const resultEtag = queryStats.resultEtag;

            const numberOfRequests = session.advanced.numberOfRequests;

            let value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);
            assertThat(value1.value.city)
                .isEqualTo("Torun");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            companies = await session.query(Company)
                .statistics(s => queryStats = s)
                .include(b => b.includeCompareExchangeValue("externalId"))
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(queryStats.durationInMs)
                .isEqualTo(-1); // from cache
            assertThat(queryStats.resultEtag)
                .isEqualTo(resultEtag);

            {
                const innerSession = store.openSession(sessionOptions);
                const value = await innerSession.advanced.clusterTransaction
                    .getCompareExchangeValue(companies[0].externalId, Address);
                value.value.city = "Bydgoszcz";

                await innerSession.saveChanges();
            }

            companies = await session.query(Company)
                .statistics(s => queryStats = s)
                .include(b => b.includeCompareExchangeValue("externalId"))
                .all();

            assertThat(companies)
                .hasSize(1);

            assertThat(queryStats.durationInMs)
                .isGreaterThan(-1); // not from cache
            assertThat(queryStats.resultEtag)
                .isNotEqualTo(resultEtag);

            value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);
            assertThat(value1.value.city)
                .isEqualTo("Bydgoszcz");
        }
    });

    it("canUseCompareExchangeValueIncludesInQueries_Dynamic_JavaScript", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const employee = new Employee();
            employee.id = "employees/1";
            employee.notes = ["companies/cf", "companies/hr"];
            await session.store(employee);

            const company = new Company();
            company.id = "companies/1";
            company.externalId = "companies/cf";
            company.name = "CF";
            await session.store(company);

            const address1 = new Address();
            address1.city = "Torun";
            await session.advanced.clusterTransaction
                .createCompareExchangeValue<Address>("companies/cf", address1);

            const address2 = new Address();
            address2.city = "Hadera";
            await session.advanced.clusterTransaction
                .createCompareExchangeValue<Address>("companies/hr", address2);

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            let stats: QueryStatistics;

            let companies = await session.advanced.rawQuery<Company>("declare function incl(c) {\n" +
                "    includes.cmpxchg(c.externalId);\n" +
                "    return c;\n" +
                "}\n" +
                "from Companies as c\n" +
                "select incl(c)")
                .statistics(s => stats = s)
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isGreaterThan(-1);

            const resultEtag = stats.resultEtag;

            const numberOfRequests = session.advanced.numberOfRequests;

            let value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);
            assertThat(value1.value.city)
                .isEqualTo("Torun");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            companies = await session.advanced.rawQuery("declare function incl(c) {\n" +
                "    includes.cmpxchg(c.externalId);\n" +
                "    return c;\n" +
                "}\n" +
                "from Companies as c\n" +
                "select incl(c)", Company)
                .statistics(s => stats = s)
                .all();

            assertThat(companies)
                .hasSize(1);

            assertThat(stats.durationInMs)
                .isEqualTo(-1);
            assertThat(stats.resultEtag)
                .isEqualTo(resultEtag);

            {
                const innerSession = store.openSession(sessionOptions);
                const value = await innerSession.advanced.clusterTransaction
                    .getCompareExchangeValue(companies[0].externalId, Address);
                value.value.city = "Bydgoszcz";

                await innerSession.saveChanges();
            }

            companies = await session.advanced.rawQuery("declare function incl(c) {\n" +
                "    includes.cmpxchg(c.externalId);\n" +
                "    return c;\n" +
                "}\n" +
                "from Companies as c\n" +
                "select incl(c)", Company)
                .statistics(s => stats = s)
                .all();

            assertThat(companies)
                .hasSize(1);

            assertThat(stats.durationInMs)
                .isGreaterThan(-1); // not from cache
            assertThat(stats.resultEtag)
                .isNotEqualTo(resultEtag);

            value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);
            assertThat(value1.value.city)
                .isEqualTo("Bydgoszcz");
        }
    });

    it("canUseCompareExchangeValueIncludesInQueries_Static", async () => {
        await new Companies_ByName().execute(store);

        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const employee = new Employee();
            employee.id = "employees/1";
            employee.notes = ["companies/cf", "companies/hr"];
            await session.store(employee);

            const company = new Company();
            company.id = "companies/1";
            company.externalId = "companies/cf";
            company.name = "CF";
            await session.store(company);

            const address1 = new Address();
            address1.city = "Torun";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/cf", address1);

            const address2 = new Address();
            address2.city = "Hadera";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/hr", address2);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession(sessionOptions);
            let stats: QueryStatistics;
            let companies = await session.query(Company, Companies_ByName)
                .statistics(s => stats = s)
                .include(i => i.includeCompareExchangeValue("externalId"))
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isGreaterThan(-1);
            const resultEtag = stats.resultEtag;

            const numberOfRequests = session.advanced.numberOfRequests;

            let value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);
            assertThat(value1.value.city)
                .isEqualTo("Torun");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            companies = await session.query(Company, Companies_ByName)
                .statistics(s => stats = s)
                .include(i => i.includeCompareExchangeValue("externalId"))
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isEqualTo(-1); // from cache
            assertThat(stats.resultEtag)
                .isEqualTo(resultEtag);

            {
                const innerSession = store.openSession(sessionOptions);
                const value = await innerSession.advanced.clusterTransaction
                    .getCompareExchangeValue(companies[0].externalId, Address);
                value.value.city = "Bydgoszcz";

                await innerSession.saveChanges();

                await testContext.waitForIndexing(store);
            }

            companies = await session.query(Company, Companies_ByName)
                .statistics(s => stats = s)
                .include(i => i.includeCompareExchangeValue("externalId"))
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isGreaterThan(-1); // not from cache
            assertThat(stats.resultEtag)
                .isNotEqualTo(resultEtag);

            value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);

            assertThat(value1.value.city)
                .isEqualTo("Bydgoszcz");
        }
    });

    it("canUseCompareExchangeValueIncludesInQueries_Static_JavaScript", async () => {
        await new Companies_ByName().execute(store);

        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const employee = new Employee();
            employee.id = "employees/1";
            employee.notes = ["companies/cf", "companies/hr"];
            await session.store(employee);

            const company = new Company();
            company.id = "companies/1";
            company.externalId = "companies/cf";
            company.name = "CF";
            await session.store(company);

            const address1 = new Address();
            address1.city = "Torun";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/cf", address1);

            const address2 = new Address();
            address2.city = "Hadera";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/hr", address2);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession(sessionOptions);
            let stats: QueryStatistics;
            let companies = await session.advanced.rawQuery<Company>(
                "declare function incl(c) {\n" +
                "    includes.cmpxchg(c.externalId);\n" +
                "    return c;\n" +
                "}\n" +
                "from index 'Companies/ByName' as c\n" +
                "select incl(c)"
            )
                .statistics(s => stats = s)
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isGreaterThan(-1);

            const resultEtag = stats.resultEtag;

            const numberOfRequests = session.advanced.numberOfRequests;

            let value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);

            assertThat(value1.value.city)
                .isEqualTo("Torun");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            companies = await session.advanced.rawQuery<Company>(
                "declare function incl(c) {\n" +
                "    includes.cmpxchg(c.externalId);\n" +
                "    return c;\n" +
                "}\n" +
                "from index 'Companies/ByName' as c\n" +
                "select incl(c)"
            )
                .statistics(s => stats = s)
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isEqualTo(-1); // from cache
            assertThat(stats.resultEtag)
                .isEqualTo(resultEtag);

            {
                const innerSession = store.openSession(sessionOptions);
                const value = await innerSession.advanced.clusterTransaction
                    .getCompareExchangeValue(companies[0].externalId, Address);
                value.value.city = "Bydgoszcz";

                await innerSession.saveChanges();
                await testContext.waitForIndexing(store);
            }

            companies = await session.advanced.rawQuery<Company>(
                "declare function incl(c) {\n" +
                "    includes.cmpxchg(c.externalId);\n" +
                "    return c;\n" +
                "}\n" +
                "from index 'Companies/ByName' as c\n" +
                "select incl(c)"
            )
                .statistics(s => stats = s)
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(stats.durationInMs)
                .isGreaterThan(-1); // not from cache
            assertThat(stats.resultEtag)
                .isNotEqualTo(resultEtag);

            value1 = await session.advanced.clusterTransaction
                .getCompareExchangeValue(companies[0].externalId, Address);
            assertThat(value1.value.city)
                .isEqualTo("Bydgoszcz");
        }
    });

    it("compareExchangeValueTrackingInSessionStartsWith", async () => {
        const allCompanies: string[] = [];

        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            for (let i = 0; i < 10; i++) {
                const company = new Company();
                company.id = "companies/" + i;
                company.externalId = "companies/hr";
                company.name = "HR";

                allCompanies.push(company.id);
                session.advanced.clusterTransaction.createCompareExchangeValue<Company>(company.id, company);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            let results = await session.advanced.clusterTransaction.getCompareExchangeValues<Company>("comp", Company);

            assertThat(results)
                .hasSize(10);
            assertThat(Object.values(results).filter(x => x.value))
                .hasSize(10);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            results = await session.advanced.clusterTransaction.getCompareExchangeValues<Company>(allCompanies, Company);

            assertThat(results)
                .hasSize(10);
            assertThat(Object.values(results).filter(x => x.value))
                .hasSize(10);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            for (const companyId of allCompanies) {
                const result = await session.advanced.clusterTransaction.getCompareExchangeValue(companyId, Company);
                assertThat(result.value)
                    .isNotNull();
                assertThat(session.advanced.numberOfRequests)
                    .isEqualTo(1);
            }
        }
    });
});

class Companies_ByName extends AbstractJavaScriptIndexCreationTask<Company, Pick<Company, "name">> {
    constructor() {
        super();

        this.map(Company, c => {
            return {
                name: c.name
            }
        });
    }
}
