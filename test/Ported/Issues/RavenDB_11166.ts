import assert from "node:assert"
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../../Utils/TestUtil.js";

import {
    IDocumentStore,
    SubscriptionCreationOptions,
    SubscriptionWorker,
} from "../../../src/index.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Dog {
    public name: string;
    public owner: string;
}

class Person {
    public name: string;
}

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB-11166", function () {

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

    it("canUseSubscriptionWithIncludes2", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Person(), { name: "Arava" }), "people/1");
            await session.store(Object.assign(new Dog(), { name: "Oscar", owner: "people/1" }));
            await session.store(Object.assign(new Dog(), { name: "Oscar2", owner: "People/2" }));
            await session.saveChanges();
        }

        const id = await store.subscriptions.create({
            query: "from Dogs include owner"
        });

        const sub = store.subscriptions.getSubscriptionWorker<Dog>(id);
        try {
            await new Promise<void>((resolve, reject) => {
                sub.on("error", reject);
                sub.on("batch", async (batch, callback) => {
                    try {
                        assertThat(batch.items)
                            .isNotEmpty();

                        const session = batch.openSession();
                        for (const item of batch.items) {
                            const owner = await session.load<Person>(item.result.owner);
                            if (item.result.owner === "people/1") {
                                assertThat(owner)
                                    .isNotNull();
                            } else {
                                assertThat(owner)
                                    .isNull();
                            }

                            const dog = await session.load<Dog>(item.id);
                            assertThat(dog)
                                .isSameAs(item.result);
                        }

                        assertThat(session.advanced.numberOfRequests)
                            .isZero();

                        callback();
                        resolve();
                    } catch (err) {
                        callback(err);
                        reject(err);
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
