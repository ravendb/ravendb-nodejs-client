import { DocumentStore, PrefixedShardingSetting } from "../../../src/index.js";
import { disposeTestDocumentStore } from "../../Utils/TestUtil.js";
import { getShardedDocumentStore } from "../../Utils/ShardingTestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Person {
    public id: string;
    public name: string;
}

class Dog {
    public id: string;
    public name: string;
    public owner: string;
}

describe("ShardedSubscriptionSlowTests", function () {

    let store: DocumentStore;

    afterEach(async () => {
        if (store) {
            await disposeTestDocumentStore(store);
            store = null;
        }
    });

    const prefixes: PrefixedShardingSetting[] = [
        { prefix: "people/", shards: [0] },
        { prefix: "dogs/", shards: [1, 2] }
    ];

    for (const [name, prefixed] of [["sharded", []], ["prefixed", prefixes]] as const) {
        it(`canUseSubscriptionWithDocumentIncludes (${name})`, async () => {
            store = await getShardedDocumentStore([...prefixed]);

            {
                const session = store.openSession();
                await session.store(Object.assign(new Person(), { name: "Arava" }), "people/1");
                await session.store(Object.assign(new Dog(), { name: "Oscar", owner: "people/1" }));
                await session.saveChanges();
            }

            const subscriptionName = await store.subscriptions.create({ query: "from Dogs include owner" });
            const worker = store.subscriptions.getSubscriptionWorker<Dog>({ subscriptionName, documentType: Dog });

            try {
                await new Promise<void>((resolve, reject) => {
                    worker.on("error", reject);
                    worker.on("batch", async (batch, callback) => {
                        try {
                            assertThat(batch.items).isNotEmpty();

                            const session = batch.openSession();
                            for (const item of batch.items) {
                                await session.load(item.result.owner, Person);
                                const dog = await session.load(item.id, Dog);
                                assertThat(dog).isSameAs(item.result);
                            }
                            assertThat(session.advanced.numberOfRequests).isEqualTo(0);

                            callback();
                            resolve();
                        } catch (e) {
                            callback(e);
                            reject(e);
                        }
                    });
                });
            } finally {
                await worker.dispose();
            }
        });
    }
});
