import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class LineItem {
    public id: string;
    public productId: string;
}

class Order {
    public id: string;
    public lineItems: LineItem[];
}

class Product {
    public id: string;
    public name: string;
}

describe("RDoc_60", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("include should work for string identifiers", async () => {
        {
            const session = store.openSession();
            const order = Object.assign(new Order(), {
                id: "orders/1",
                lineItems: [Object.assign(new LineItem(), { id: "lineItems/1", productId: "products/1" })]
            });

            const product = Object.assign(new Product(), { id: "products/1", name: "Product 1" });

            await session.store(product);
            await session.store(order);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const order = await session.include("lineItems[].productId").load("orders/1", Order);

            for (const lineItem of order.lineItems) {
                await session.load(lineItem.productId, Product);
            }

            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        }
    });
});
