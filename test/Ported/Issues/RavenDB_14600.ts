import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src";
import { Employee, Order } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_14600Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIncludeFacetResult", async () => {
        {
            const session = store.openSession();
            const employee = new Employee();
            employee.firstName = "Test";
            await session.store(employee, "employees/1");

            const order = new Order();
            order.employee = "employees/1";
            order.company = "companies/1-A";

            await session.store(order, "orders/1");
            await session.saveChanges();
        }

        await store.executeIndex(new MyIndex());

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const facets = await session.query(Order, MyIndex)
                .include("employee")
                .whereEquals("company", "companies/1-A")
                .aggregateBy(x => x.byField("employee"))
                .execute();

            assertThat(facets["employee"].values)
                .isNotNull();

            for (const f of facets["employee"].values) {
                await session.load(f.range);
            }

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });
});

class MyIndex extends AbstractJavaScriptIndexCreationTask<Order, Pick<Order, "employee" | "company">> {
    public constructor() {
        super();

        this.map(Order, o => ({
            employee: o.employee,
            company: o.company
        }));
    }
}
