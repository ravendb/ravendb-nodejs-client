import { IDocumentStore, SessionOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Address } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_14005", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetCompareExchangeValuesLazilyNoTracking", async () => {
        await canGetCompareExchangeValuesLazily(true);
    });

    it("canGetCompareExchangeValuesLazilyWithTracking", async () => {
        await canGetCompareExchangeValuesLazily(false);
    });

    async function canGetCompareExchangeValuesLazily(noTracking: boolean)  {
        const sessionOptions: SessionOptions = {
            noTracking,
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const lazyValue = await session.advanced.clusterTransaction.lazily
                .getCompareExchangeValue<Address>("companies/hr", Address);

            assertThat(lazyValue.isValueCreated())
                .isFalse();

            const address = await lazyValue.getValue();
            assertThat(address)
                .isNull();

            const value = await session.advanced.clusterTransaction
                .getCompareExchangeValue<Address>("companies/hr", Address);

            assertThat(value)
                .isEqualTo(address);

            const lazyValues = session.advanced.clusterTransaction.lazily
                .getCompareExchangeValues<Address>(["companies/hr", "companies/cf"], Address);

            assertThat(lazyValues.isValueCreated())
                .isFalse();

            const addresses = await lazyValues.getValue();

            assertThat(addresses)
                .isNotNull()
                .hasSize(2)
                .containsKey("companies/hr")
                .containsKey("companies/cf");


            assertThat(addresses["companies/hr"])
                .isNull();
            assertThat(addresses["companies/cf"])
                .isNull();

            const values = await session.advanced.clusterTransaction
                .getCompareExchangeValues<Address>(["companies/hr", "companies/cf"], Address);

            assertThat(values)
                .containsKey("companies/hr")
                .containsKey("companies/cf");

            assertThat(addresses["companies/hr"])
                .isEqualTo(values["companies/hr"]);
            assertThat(addresses["companies/cf"])
                .isEqualTo(values["companies/cf"]);
        }

        {
            const session = store.openSession(sessionOptions);
            const lazyValue = session.advanced
                .clusterTransaction
                .lazily
                .getCompareExchangeValue<Address>("companies/hr");

            const lazyValues = session.advanced
                .clusterTransaction
                .lazily
                .getCompareExchangeValues<Address>(["companies/hr", "companies/cf"], Address);

            assertThat(lazyValue.isValueCreated())
                .isFalse();
            assertThat(lazyValues.isValueCreated())
                .isFalse();

            await session.advanced.eagerly.executeAllPendingLazyOperations();

            const numberOfRequests = session.advanced.numberOfRequests;

            const address = await lazyValue.getValue();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            assertThat(address)
                .isNull();

            const addresses = await lazyValues.getValue();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequests);

            assertThat(addresses)
                .isNotNull()
                .hasSize(2)
                .containsKey("companies/hr")
                .containsKey("companies/cf");

            assertThat(addresses["companies/hr"])
                .isNull();
            assertThat(addresses["companies/cf"])
                .isNull();
        }

        const clusterSessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(clusterSessionOptions);

            const address1 = new Address();
            address1.city = "Hadera";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/hr", address1);

            const address2 = new Address();
            address2.city = "Torun";
            session.advanced.clusterTransaction.createCompareExchangeValue<Address>("companies/cf", address2);

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);

            const lazyValue = session
                .advanced
                .clusterTransaction
                .lazily
                .getCompareExchangeValue<Address>("companies/hr", Address);

            assertThat(lazyValue.isValueCreated())
                .isFalse();

            const address = await lazyValue.getValue();
            assertThat(address)
                .isNotNull();

            assertThat(address.value.city)
                .isEqualTo("Hadera");


            const value = await session.advanced.clusterTransaction.getCompareExchangeValue<Address>("companies/hr", Address);
            assertThat(value.value.city)
                .isEqualTo(address.value.city);

            const lazyValues = session
                .advanced
                .clusterTransaction
                .lazily
                .getCompareExchangeValues<Address>(["companies/hr", "companies/cf"], Address);

            assertThat(lazyValues.isValueCreated())
                .isFalse();

            const addresses = await lazyValues.getValue();

            assertThat(addresses)
                .isNotNull()
                .hasSize(2)
                .containsKey("companies/hr")
                .containsKey("companies/cf");

            assertThat(addresses["companies/hr"].value.city)
                .isEqualTo("Hadera");
            assertThat(addresses["companies/cf"].value.city)
                .isEqualTo("Torun");

            const values = await session.advanced
                .clusterTransaction
                .getCompareExchangeValues<Address>(["companies/hr", "companies/cf"], Address);

            assertThat(values)
                .containsKey("companies/hr")
                .containsKey("companies/cf");

            assertThat(addresses["companies/hr"].value.city)
                .isEqualTo(values["companies/hr"].value.city);

            assertThat(addresses["companies/cf"].value.city)
                .isEqualTo(values["companies/cf"].value.city);
        }
    }
});
