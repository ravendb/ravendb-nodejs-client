import { IDocumentStore, SubscriptionCreationOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Product } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_13478", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIncludeCountersInSubscriptions", async () => {
        {
            const session = store.openSession();
            const product = new Product();
            await session.store(product);

            session.countersFor(product)
                .increment("likes", 3);
            session.countersFor(product)
                .increment("dislikes", 5);

            await session.saveChanges();
        }

        let options: SubscriptionCreationOptions = {
            includes: builder => builder.includeCounter("likes").includeCounter("dislikes"),
            documentType: Product
        };
        
        let name = await store.subscriptions.create(options);

        await assertSubscription(store, name, 0);

        options = {
            includes: builder => builder.includeAllCounters(),
            documentType: Product
        };

        name = await store.subscriptions.create(options);

        await assertSubscription(store, name, 0);

        options = {
            includes: builder => builder.includeCounter("likes"),
            documentType: Product
        };

        name = await store.subscriptions.create(options);

        await assertSubscription(store, name, 1);

        name = await store.subscriptions.create(Product);

        await assertSubscription(store, name, 2);
    });
});


async function assertSubscription(store: IDocumentStore, name: string, expectedNumberOfRequests: number) {
    const sub = store.subscriptions.getSubscriptionWorker<Product>(name);
    try {
        await new Promise<void>((resolve, reject) => {
            sub.on("error", reject)
            sub.on("batch", async (batch, callback) => {
                assertThat(batch.items.length)
                    .isGreaterThan(0);

                try {
                    const s = batch.openSession();

                    for (const item of batch.items) {
                        const product = await s.load<Product>(item.id, Product);
                        assertThat(item.result)
                            .isSameAs(product);

                        const likesValues = await s.countersFor(product).get("likes");
                        assertThat(likesValues)
                            .isEqualTo(3);

                        const dislikesValue = await s.countersFor(product).get("dislikes");
                        assertThat(dislikesValue)
                            .isEqualTo(5);
                    }

                    assertThat(s.advanced.numberOfRequests)
                        .isEqualTo(expectedNumberOfRequests);

                    resolve();
                    callback();
                } catch (err) {
                    reject(err);
                    callback(err);
                }
            })
        })
    } finally {
        sub.dispose();
    }
}
