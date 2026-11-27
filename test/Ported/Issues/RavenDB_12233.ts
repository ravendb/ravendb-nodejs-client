import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { Order, OrderLine } from "../../Assets/Orders.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_12233", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("failing test bulk insert", async () => {
        const count = 500;
        const s = "\u0000";

        {
            const session = store.openSession();
            for (let i = 0; i < count; i++) {
                const line = () => Object.assign(new OrderLine(), { product: `products/${i}`, productName: s });
                await session.store(Object.assign(new Order(), {
                    company: `companies/${i}`,
                    employee: `employee/${i}`,
                    lines: [line(), line()]
                }));
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const stream = await session.advanced.stream<Order>("orders/");
            for await (const item of stream) {
                for (const line of item.document.lines) {
                    assertThat(line.productName).isEqualTo(s);
                }
            }
        }
    });
});
