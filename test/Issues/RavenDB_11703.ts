import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    CounterChange,
    IChangesObservable,
} from "../../src";
import { User } from "../Assets/Entities";
import { timeout, delay } from "../../src/Utility/PromiseUtil";

describe("RavenDB-11703", function () {

    this.retries(3);

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetNotificationAboutCounterIncrement", async () => {
        const changes = store.changes();
        await changes.ensureConnectedNow();
        const observable = changes.forCountersOfDocument("users/1");

        const changesList: CounterChange[] = [];
        observable.on("data", d => changesList.unshift(d));
        const errored = new Promise((_, reject) => observable.on("error", reject));

        async function act() {
            {
                const session = store.openSession();
                const user = new User();
                await session.store(user, "users/1");
                await session.saveChanges();
            }
            {
                const session = store.openSession();
                session.countersFor("users/1").increment("likes");
                await session.saveChanges();
            }
            {
                const session = store.openSession();
                session.countersFor("users/1").increment("likes");
                await session.saveChanges();
            }
            
            await delay(100);
        }

        await Promise.race([errored, timeout(2000), act()]);

        assert.strictEqual(changesList.length, 2, "Expected exactly 2 changes to show up.");

        let counterChange = changesList.pop();
        assert.ok(counterChange);
        assert.strictEqual(counterChange.documentId, "users/1");
        assert.strictEqual(counterChange.type, "Put");
        assert.strictEqual(counterChange.name, "likes");
        assert.strictEqual(counterChange.value, 1);
        assert.ok(counterChange.changeVector);

        counterChange = changesList.pop();
        assert.ok(counterChange);
        assert.strictEqual(counterChange.documentId, "users/1");
        assert.strictEqual(counterChange.type, "Increment");
        assert.strictEqual(counterChange.name, "likes");
        assert.strictEqual(counterChange.value, 2);
        assert.ok(counterChange.changeVector);
    });

    it("canGetNotificationAboutCounterDelete", async function () {
        const changes = store.changes();
        await changes.ensureConnectedNow();
        const observable = changes.forCountersOfDocument("users/1");

        const changesList: CounterChange[] = [];
        observable.on("data", d => changesList.unshift(d));
        const errored = new Promise((_, reject) => observable.on("error", reject));

        async function act() {
            {
                const session = store.openSession();
                const user = new User();
                await session.store(user, "users/1");
                await session.saveChanges();
            }
            {
                const session = store.openSession();
                session.countersFor("users/1").increment("likes");
                await session.saveChanges();
            }
            {
                const session = store.openSession();
                session.countersFor("users/1").delete("likes");
                await session.saveChanges();
            }

            await delay(100);
        }

        await Promise.race([errored, timeout(2000), act()]);
        
        assert.strictEqual(changesList.length, 2, "Expected exactly 2 changes to show up.");

        let counterChange = changesList.pop();
        assert.ok(counterChange);
        assert.strictEqual(counterChange.documentId, "users/1");
        assert.strictEqual(counterChange.type, "Put");
        assert.strictEqual(counterChange.name, "likes");
        assert.strictEqual(counterChange.value, 1);
        assert.ok(counterChange.changeVector);

        counterChange = changesList.pop();
        assert.ok(counterChange);
        assert.strictEqual(counterChange.documentId, "users/1");
        assert.strictEqual(counterChange.type, "Delete");
        assert.strictEqual(counterChange.name, "likes");
        assert.strictEqual(counterChange.value, 0);
        assert.ok(counterChange.changeVector);

    });

    async function gatherChangesFor<T>(observable: IChangesObservable<T>, ms: number) {
        const changesList: T[] = [];
        observable.on("data", d => changesList.unshift(d));
        const errored = new Promise((_, reject) => observable.on("error", reject));
        await Promise.race([errored, delay(ms)]);
        return changesList;
    }

    it("canSubscribeToCounterChanges", async function () {

        const changes = store.changes();
        await changes.ensureConnectedNow();

        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        let observable = changes.forAllCounters();
        let gatherPromise = gatherChangesFor(observable, 500);

        {
            const session = store.openSession();
            session.countersFor("users/1").increment("likes");
            await session.saveChanges();
        }

        let changesList = await gatherPromise;
        let counterChange = changesList.pop();
        assert.ok(counterChange);

        observable = changes.forCounter("likes");
        gatherPromise = gatherChangesFor(observable, 500);

        {
            const session = store.openSession();
            session.countersFor("users/1").increment("likes");
            session.countersFor("users/1").increment("dislikes");
            await session.saveChanges();
        }

        counterChange = (await gatherPromise).pop();
        assert.ok(counterChange);
        assert.strictEqual(counterChange.name, "likes");

        assert.strictEqual((await gatherChangesFor(observable, 200)).length, 0);

        observable = changes.forCounterOfDocument("users/1", "likes");
        gatherPromise = gatherChangesFor(observable, 500);

        {
            const session = store.openSession();
            session.countersFor("users/1").increment("likes");
            session.countersFor("users/1").increment("dislikes");
            await session.saveChanges();
        }

        counterChange = (await gatherPromise).pop();
        assert.ok(counterChange);
        assert.strictEqual(counterChange.name, "likes");

        assert.strictEqual((await gatherChangesFor(observable, 200)).length, 0);

        observable = changes.forCountersOfDocument("users/1");
        gatherPromise = gatherChangesFor(observable, 500);
        {
            const session = store.openSession();
            session.countersFor("users/1").increment("likes");
            session.countersFor("users/1").increment("dislikes");
            await session.saveChanges();
        }

        changesList = await gatherPromise;
        assert.strictEqual(changesList.length, 2);
        assert.ok(changesList.some(x => x.name === "likes"));
        assert.ok(changesList.some(x => x.name === "dislikes"));
    });
});
