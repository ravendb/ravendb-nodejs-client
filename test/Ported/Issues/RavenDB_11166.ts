import * as assert from "assert";
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../../Utils/TestUtil";

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

(RavenTestContext.is60Server ? describe.skip : describe)("RavenDB-11166", function () {

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
            await new Promise<void>((resolve, reject) => {
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

    it("canUseSubscriptionRevisionsWithIncludes", async () => {
        await testContext.setupRevisions(store, false, 5);

        {
            const session = store.openSession();
            const person = new Person();
            person.name = "Arava";
            await session.store(person, "people/1");

            const person2 = new Person();
            person2.name = "Karmel";
            await session.store(person2, "people/2");

            const dog = new Dog();
            dog.name = "Oscar";
            dog.owner = "people/1";
            await session.store(dog, "dogs/1");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const dog = new Dog();
            dog.name = "Oscar";
            dog.owner = "people/2";
            await session.store(dog, "dogs/1");
            await session.saveChanges();
        }

        const options: SubscriptionCreationOptions = {
            query: "from Dogs (Revisions = true) as d include d.Current.owner, d.Previous.owner",
        }
        const id = await store.subscriptions.create(options);

        {
            const sub = store.subscriptions.getSubscriptionWorkerForRevisions({
                documentType: Dog,
                subscriptionName: id
            });

            try {

                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(reject, 15_000);

                    sub.on("batch", async batch => {
                        assertThat(batch.items.length > 0)
                            .isTrue();

                        {
                            const s = batch.openSession();
                            for (const item of batch.items) {
                                if (!item.result.previous) {
                                    continue;
                                }

                                const currentOwner = await s.load(item.result.current.owner, Person);
                                assertThat(currentOwner.name)
                                    .isEqualTo("Karmel");
                                const previousOwner = await s.load(item.result.previous.owner, Person);
                                assertThat(previousOwner.name)
                                    .isEqualTo("Arava");
                            }

                            assertThat(s.advanced.numberOfRequests)
                                .isZero();
                        }

                        resolve();
                        clearTimeout(timeout);
                    });
                });
            } finally {
                sub.dispose();
            }
        }
    });
});
