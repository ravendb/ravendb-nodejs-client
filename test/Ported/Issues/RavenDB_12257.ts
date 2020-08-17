import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Category, Product, Supplier } from "../../Assets/Orders";
import { SubscriptionCreationOptions } from "../../../src/Documents/Subscriptions/SubscriptionCreationOptions";
import { assertThat } from "../../Utils/AssertExtensions";

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

        await new Promise(resolve => {
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
});
