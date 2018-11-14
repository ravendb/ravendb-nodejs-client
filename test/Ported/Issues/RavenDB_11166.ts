import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
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

describe.only("RavenDB-11166", function () {

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
            query: "from Dogs include Owner"
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

// public class RavenDB_11166Test extends RemoteTestBase {


//     @Test
//     public void () throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {

//             SubscriptionCreationOptions options = new SubscriptionCreationOptions();
//             options.setQuery("from Dogs include Owner");
//             String id = store.subscriptions().create(options);

//             try (SubscriptionWorker<Dog> sub = store.subscriptions().getSubscriptionWorker(Dog.class, id)) {

//                 Semaphore semaphore = new Semaphore(0);
//                 CompletableFuture<Void> run = sub.run(batch -> {
//                     assertThat(batch.getItems())
//                             .isNotEmpty();

//                     try (IDocumentSession s = batch.openSession()) {
//                         for (SubscriptionBatch.Item<Dog> item : batch.getItems()) {
//                             s.load(Person.class, item.getResult().getOwner());
//                             Dog dog = s.load(Dog.class, item.getId());
//                             assertThat(dog)
//                                     .isSameAs(item.getResult());
//                         }

//                         assertThat(s.advanced().getNumberOfRequests())
//                                 .isZero();

//                         semaphore.release();
//                     }
//                 });

//                 assertThat(semaphore.tryAcquire(15, TimeUnit.SECONDS))
//                         .isTrue();
//             }
//         }
//     }
// }