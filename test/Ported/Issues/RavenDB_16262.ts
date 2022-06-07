import { IDocumentStore, SubscriptionCreationOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Product } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_16262Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIncludeCountersInSubscriptions_EvenIfTheyDoNotExist", async () => {
        {
            const session = store.openSession();
            const product = new Product();
            await session.store(product, "products/1");
            await session.saveChanges();
        }

        const creationOptions: SubscriptionCreationOptions = {
            includes: i => i.includeCounter("likes").includeCounter("dislikes"),
            documentType: Product
        };

        const name = await store.subscriptions.create(creationOptions);

        const sub = store.subscriptions.getSubscriptionWorker<Product>(name);
        try {
            await new Promise<void>((resolve, reject) => {
                sub.on("error", reject);
                sub.on("batch", async (batch, callback) => {
                    assertThat(batch.items.length)
                        .isGreaterThan(0);

                    {
                        const s = batch.openSession();
                        for (const item of batch.items) {
                            const product = await s.load(item.id, Product);
                            assertThat(item.result)
                                .isSameAs(product);

                            const likesValues = await s.countersFor(product).get("likes");
                            assertThat(likesValues)
                                .isNull();

                            const dislikesValue = await s.countersFor(product).get("dislikes");
                            assertThat(dislikesValue)
                                .isNull();
                        }

                        assertThat(s.advanced.numberOfRequests)
                            .isEqualTo(0);
                    }

                    resolve();
                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });
});
