import {
    ClientConfiguration,
    GetStatisticsOperation,
    IDocumentStore,
    PutClientConfigurationOperation,
    SessionOptions
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_13456", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canChangeIdentityPartsSeparator", async () => {
        {
            const session = store.openSession();
            const company1 = new Company();
            await session.store(company1);

            assertThat(company1.id)
                .isEqualTo("companies/1-A");

            const company2 = new Company();
            await session.store(company2);

            assertThat(company2.id)
                .isEqualTo("companies/2-A");
        }

        {
            const session = store.openSession();
            const company1 = new Company();
            await session.store(company1, "companies/");

            const company2 = new Company();
            await session.store(company2, "companies|");

            await session.saveChanges();

            assertThat(company1.id)
                .startsWith("companies/000000000");
            assertThat(company2.id)
                .isEqualTo("companies/1");
        }

        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue<Company>("company:", new Company());
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue<Company>("company|", new Company());

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Document id company| cannot end with '|' or '/' as part of cluster transaction");
            });

        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue<Company>("company/", new Company());

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Document id company/ cannot end with '|' or '/' as part of cluster transaction");
            });
        }

        const clientConfiguration: ClientConfiguration = {
            identityPartsSeparator: ":"
        };

        await store.maintenance.send(new PutClientConfigurationOperation(clientConfiguration));

        await store.maintenance.send(new GetStatisticsOperation());  // forcing client configuration update

        {
            const session = store.openSession();
            const company1 = new Company();
            await session.store(company1);

            assertThat(company1.id)
                .startsWith("companies:3-A");

            const company2 = new Company();
            await session.store(company2);

            assertThat(company2.id)
                .startsWith("companies:4-A");
        }

        {
            const session = store.openSession();
            const company1 = new Company();
            await session.store(company1, "companies:");

            const company2 = new Company();
            await session.store(company2, "companies|");

            await session.saveChanges();

            assertThat(company1.id)
                .startsWith("companies:000000000");
            assertThat(company2.id)
                .isEqualTo("companies:2");
        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("company:", new Company());

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Document id company: cannot end with '|' or ':' as part of cluster transaction");
            });
        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("company|", new Company());

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Document id company| cannot end with '|' or ':' as part of cluster transaction");
            });
        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("company/", new Company());

            await session.saveChanges();
        }

        const secondClientConfiguration: ClientConfiguration = {
            identityPartsSeparator: null
        };

        await store.maintenance.send(new PutClientConfigurationOperation(secondClientConfiguration));

        await store.maintenance.send(new GetStatisticsOperation()); // forcing client configuration update

        {
            const session = store.openSession();
            const company1 = new Company();
            await session.store(company1);

            assertThat(company1.id)
                .startsWith("companies/5-A");

            const company2 = new Company();
            await session.store(company2);

            assertThat(company2.id)
                .startsWith("companies/6-A");
        }

        {
            const session = store.openSession();
            const company1 = new Company();
            await session.store(company1, "companies/");

            const company2 = new Company();
            await session.store(company2, "companies|");

            await session.saveChanges();

            assertThat(company1.id)
                .startsWith("companies/000000000");
            assertThat(company2.id)
                .isEqualTo("companies/3");
        }

        {
            const session = store.openSession(sessionOptions);
            const company = await session.advanced.clusterTransaction.getCompareExchangeValue("company:", Company);
            company.value.name = "HR";

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("company|", new Company());

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Document id company| cannot end with '|' or '/' as part of cluster transaction");
            })
        }

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue<Company>("company/", new Company());

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Document id company/ cannot end with '|' or '/' as part of cluster transaction");
            })
        }
    });
});
