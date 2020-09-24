import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    SubscriptionCreationOptions,
    SubscriptionWorker,
} from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

class Dog {
    public name: string;
    public owner: string;
}

class Person {
    public name: string;
}

describe("RavenDB-11166", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("canUseSubscriptionWithIncludes ", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Person(), { name: "Arava" }), "people/1");
            await session.store(Object.assign(new Dog(), { name: "Oscar", owner: "people/1" }));
            await session.saveChanges();
        }

        const options: SubscriptionCreationOptions = {
            query: "from dogs include owner"
        };
        const id = await store.subscriptions.create(options);

        let sub: SubscriptionWorker<Dog>; 
        try {
            sub = store.subscriptions.getSubscriptionWorker<Dog>(id);
            await new Promise((resolve, reject) => {
                sub.on("error", reject);
                sub.on("batch", async (batch, callback) => {
                    assertThat(batch.items)
                        .isNotEmpty();

                    try {
                        const session = batch.openSession();
                        for (const item of batch.items) {
                            await session.load(item.result.owner);
                            const dog = await session.load(item.id);
                            assert.strictEqual(JSON.stringify(dog), JSON.stringify(item.result));
                            assertThat(session.advanced.numberOfRequests).isZero();
                            resolve();
                            callback();
                        }
                    } catch (err) {
                        reject(err);
                        callback(err);
                    }
                });
            });
        } finally {
            sub.dispose();
        }
    });
});
