import { User } from "../../Assets/Entities";
import * as assert from "assert";
import { parser } from "stream-json/Parser";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../../src";
import { AsyncQueue } from "../../Utils/AsyncQueue";

describe("SecuredSubscriptionsBasicTest", function () {
    const _reasonableWaitTime = 5 * 1000;
    this.timeout(5 * _reasonableWaitTime);

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getSecuredDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));


    it("should stream all documents after subscription creation", async function () {
        store.initialize();
        {
            const session = store.openSession();
            const user1 = new User();
            user1.age = 31;
            await session.store(user1, "users/1");

            const user2 = new User();
            user2.age = 27;
            await session.store(user2, "users/12");

            const user3 = new User();
            user3.age = 25;
            await session.store(user3, "users/3");

            await session.saveChanges();
        }

        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            documentType: User,
            maxErroneousPeriod: 3000
        });

        const keys = new AsyncQueue<string>();
        const ages = new AsyncQueue<number>();

        subscription.on("batch", (batch, callback) => {
            batch.items.forEach(x => keys.push(x.id));
            batch.items.forEach(x => ages.push(x.result.age));
            callback();
        });

        const errPromise = new Promise((_, reject) => {
            subscription.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, assertResults()]);

        async function assertResults() {
            let key = await keys.poll(_reasonableWaitTime);
            assert.strictEqual(key, "users/1");

            key = await keys.poll(_reasonableWaitTime);
            assert.strictEqual(key, "users/12");

            key = await keys.poll(_reasonableWaitTime);
            assert.strictEqual(key, "users/3");

            let age = await ages.poll(_reasonableWaitTime);
            assert.strictEqual(age, 31);

            age = await ages.poll(_reasonableWaitTime);
            assert.strictEqual(age, 27);

            age = await ages.poll(_reasonableWaitTime);
            assert.strictEqual(age, 25);
        }
    });

    it("should send all new and modified docs", async function () {
        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            documentType: User,
            maxErroneousPeriod: 3000
        });

        try {
            const names = new AsyncQueue<string>();

            {
                const session = store.openSession();
                const user = new User();
                user.name = "James";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            subscription.on("batch", (batch, callback) => {
                batch.items.forEach(x => {
                    names.push(x.result.name);
                });
                callback();
            });

            let name = await names.poll(_reasonableWaitTime);
            assert.strictEqual(name, "James");

            {
                const session = store.openSession();
                const user = new User();
                user.name = "Adam";
                await session.store(user, "users/12");
                await session.saveChanges();
            }

            name = await names.poll(_reasonableWaitTime);
            assert.strictEqual(name, "Adam");

            {
                const session = store.openSession();
                const user = new User();
                user.name = "David";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            name = await names.poll(_reasonableWaitTime);
            assert.strictEqual(name, "David");
        } finally {
            subscription.dispose();
        }
    });
});
