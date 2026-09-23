import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { Category, Order, OrderLine, Product, Supplier } from "../../Assets/Orders.js";
import {
    SubscriptionCreationOptions,
    IDocumentStore
} from "../../../src/index.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_12257", function () {

    const _reasonableWaitTime = 60;

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseSubscriptionIncludesViaStronglyTypedApi", async () => {
        {
            const session = store.openSession();
            const product = new Product();
            const category = new Category();
            const supplier = new Supplier();

            await session.store(category);
            await session.store(product);

            product.category = category.id;
            product.supplier = supplier.id;

            await session.store(product);

            await session.saveChanges();
        }

        const options: SubscriptionCreationOptions = {
            includes: builder => builder.includeDocuments("category").includeDocuments("supplier"),
            documentType: Product
        };

        const name = await store.subscriptions.create(options);

        const sub = store.subscriptions.getSubscriptionWorker<Product>({
            subscriptionName: name,
            documentType: Product
        });

        await new Promise<void>(resolve => {
            sub.on("batch", async (batch, cb) => {
                assertThat(batch.items)
                    .isNotEmpty();

                {
                    const s = batch.openSession();
                    for (const item of batch.items) {
                        await s.load<Category>(item.result.category, Category);
                        await s.load<Supplier>(item.result.supplier, Supplier);

                        const product = await s.load(item.id, Product);
                        assertThat(product)
                            .isSameAs(item.result);
                    }

                    assertThat(s.advanced.numberOfRequests)
                        .isZero();

                    cb();
                    resolve();
                }
            });
        });
    });

    it("canUseSubscriptionIncludesOnArraysViaStronglyTypedApi", async () => {
        {
            const session = store.openSession();
            const product1 = new Product();
            product1.name = "P1";

            const product2 = new Product();
            product2.name = "P2";

            await session.store(product1);
            await session.store(product2);

            const order1 = new Order();
            order1.lines = [
                Object.assign(new OrderLine(), { product: product1.id }),
                Object.assign(new OrderLine(), { product: product2.id })
            ];

            const order2 = new Order();
            order2.lines = [
                Object.assign(new OrderLine(), { product: product2.id })
            ];

            await session.store(order1);
            await session.store(order2);

            await session.saveChanges();
        }

        const options: SubscriptionCreationOptions = {
            includes: builder => builder.includeDocuments("lines[].product"),
            documentType: Order
        };

        const name = await store.subscriptions.create(options);

        const sub = store.subscriptions.getSubscriptionWorker<Order>({
            subscriptionName: name,
            documentType: Order
        });

        try {
            await new Promise<void>((resolve, reject) => {
                sub.on("error", reject);
                sub.on("batch", async (batch, cb) => {
                    try {
                        assertThat(batch.items)
                            .isNotEmpty();

                        const s = batch.openSession();
                        for (const item of batch.items) {
                            const res = await s.load(item.result.lines.map(x => x.product), Product);
                            assertThat(res)
                                .hasSize(item.result.lines.length);
                        }

                        assertThat(s.advanced.numberOfRequests)
                            .isZero();

                        cb();
                        resolve();
                    } catch (err) {
                        cb(err);
                        reject(err);
                    }
                });
            });
        } finally {
            sub.dispose();
        }
    });
});
