import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company, Order } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15000", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIncludeTimeSeriesWithoutProvidingFromAndToDates_ViaLoad", async () => {
        {
            const session = store.openSession();
            const order = new Order();
            order.company = "companies/1-A";
            await session.store(order, "orders/1-A");

            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1-A");

            session.timeSeriesFor("orders/1-A", "Heartrate")
                .append(new Date(), 1);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const order = await session.load<Order>("orders/1-A", {
                documentType: Order,
                includes: i => i.includeDocuments("company").includeTimeSeries("Heartrate")
            });

            // should not go to server
            const company = await session.load<Company>(order.company, Company);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server
            const vals = await session.timeSeriesFor(order, "Heartrate").get();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(1);
        }
    });

    it("canIncludeTimeSeriesWithoutProvidingFromAndToDates_ViaQuery", async () => {
        {
            const session = store.openSession();
            const order = new Order();
            order.company = "companies/1-A";
            await session.store(order, "orders/1-A");

            const company = new Company();
            company.name = "HR";
            await session.store(company, "companies/1-A");

            session.timeSeriesFor("orders/1-A", "Heartrate")
                .append(new Date(), 1);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const order = await session.query<Order>(Order)
                .include(i => i.includeDocuments("company").includeTimeSeries("Heartrate"))
                .first();

            // should not go to server
            const company = await session.load<Company>(order.company, Company);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(company.name)
                .isEqualTo("HR");

            // should not go to server

            const vals = await session.timeSeriesFor(order, "Heartrate").get();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(vals)
                .hasSize(1);
        }
    })
});
