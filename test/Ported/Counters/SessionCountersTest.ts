import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    GetCountersOperation,
    CreateDatabaseOperation,
    DatabaseRecord,
    DeleteDatabasesOperation,
    IDocumentSession,
    DocumentCountersOperation,
    CounterOperation,
    CounterBatch,
    CounterBatchOperation,
} from "../../../src";
import { User, Company, Order } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe.only("SessionCountersTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("sessionIncrementCounter", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Aviv1" }), "users/1-A");
            await session.store(Object.assign(new User(), { name: "Aviv2" }), "users/2-A");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("downloads", 500);
            session.countersFor("users/2-A").increment("votes", 1000);
            await session.saveChanges();
        }
        {
            let counters = (await store.operations.send(
                new GetCountersOperation("users/1-A", ["likes", "downloads"]))).counters;
            assert.strictEqual(counters.length, 2);
            assert.strictEqual(
                counters.filter(x => x.counterName === "likes")[0].totalValue, 100);
            assert.strictEqual(
                counters.filter(x => x.counterName === "downloads")[0].totalValue, 500);
            
            counters = (await store.operations.send(new GetCountersOperation("users/2-A", ["votes"]))).counters;
            assert.strictEqual(counters.length, 1);
            assert.strictEqual(
                counters.filter(x => x.counterName === "votes")[0].totalValue, 1000);
        }
    });

    it("sessionDeleteCounter", async function () {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Aviv1" }), "users/1-A");
            await session.store(Object.assign(new User(), { name: "Aviv2" }), "users/2-A");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("downloads", 500);
            session.countersFor("users/2-A").increment("votes", 1000);
            await session.saveChanges();
        }

        let { counters } = (await store.operations
                   .send(new GetCountersOperation("users/1-A", ["likes", "downloads"])));
        assert.strictEqual(counters.length, 2);

        {
            const session = store.openSession();
            session.countersFor("users/1-A").delete("likes");
            session.countersFor("users/1-A").delete("downloads");
            session.countersFor("users/2-A").delete("votes");
            await session.saveChanges();
        }

        ({ counters } = (await store.operations
                   .send(new GetCountersOperation("users/1-A", ["likes", "downloads"]))));
        assert.strictEqual(counters.length, 0);

        ({ counters } = (await store.operations
                   .send(new GetCountersOperation("users/1-A", ["votes"]))));
        assert.strictEqual(counters.length, 0);
    });

    it("sessionGetCounters", async function () {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Aviv1" }), "users/1-A");
            await session.store(Object.assign(new User(), { name: "Aviv2" }), "users/2-A");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("downloads", 500);
            session.countersFor("users/2-A").increment("votes", 1000);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const dic = await session.countersFor("users/1-A").getAll();
            assert.strictEqual(Object.keys(dic).length, 2);
            assert.strictEqual(dic["likes"], 100);
            assert.strictEqual(dic["downloads"], 500);

            const c = await session.countersFor("users/2-A").get("votes");
            assert.strictEqual(c, 1000);
        }
        {
            const session = store.openSession();
            const dic = await session.countersFor("users/1-A").get(["likes", "downloads"]);
            assert.strictEqual(Object.keys(dic).length, 2);
            assert.strictEqual(dic["likes"], 100);
            assert.strictEqual(dic["downloads"], 500);
        }
        {
            const session = store.openSession();
            const dic = await session.countersFor("users/1-A").get(["likes"]);
            assert.strictEqual(Object.keys(dic).length, 1);
            assert.strictEqual(dic["likes"], 100);
        }
    });

    it("sessionGetCountersWithNonDefaultDatabase", async function () {
        const dbName = "db-" + (Math.random() * 1000 + 1).toFixed(2);
        await store.maintenance.server.send(
            new CreateDatabaseOperation({ databaseName: dbName }));
        
        try {
            {
                const session = store.openSession(dbName);
                await session.store(Object.assign(new User(), { name: "Aviv1" }), "users/1-A");
                await session.store(Object.assign(new User(), { name: "Aviv2" }), "users/2-A");
                await session.saveChanges();
            }
            {
                const session = store.openSession(dbName);
                session.countersFor("users/1-A").increment("likes", 100);
                session.countersFor("users/1-A").increment("downloads", 500);
                session.countersFor("users/2-A").increment("votes", 1000);
                await session.saveChanges();
            }
            {
                const session = store.openSession(dbName);
                const dic = await session.countersFor("users/1-A").getAll();
                assert.strictEqual(Object.keys(dic).length, 2);
                assert.strictEqual(dic["likes"], 100);
                assert.strictEqual(dic["downloads"], 500);

                const c = await session.countersFor("users/2-A").get("votes");
                assert.strictEqual(c, 1000);
            }

        } finally {
            await store.maintenance.server.send(
                new DeleteDatabasesOperation({ 
                    databaseNames: [ dbName], 
                    hardDelete: true 
                }));
        }
    });

    it("getCountersFor", async function() {
        {
            const session = store.openSession();
            for (const n of [1, 2, 3]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("downloads", 100);
            session.countersFor("users/2-A").increment("votes", 100);
            await session.saveChanges();
        }

        {
            const session = store.openSession();

            let user = await session.load<User>("users/1-A");
            let counters = session.advanced.getCountersFor(user);
            assert.strictEqual(counters.length, 2);
            assert.ok(counters.includes("downloads"));
            assert.ok(counters.includes("likes"));

            user = await session.load<User>("users/2-A");
            counters = session.advanced.getCountersFor(user);
            assert.strictEqual(counters.length, 1);
            assert.ok(counters.includes("votes"));

            user = await session.load<User>("users/3-A");
            counters = session.advanced.getCountersFor(user);
            assert.strictEqual(counters, null);
        }
    });

    it("differentTypesOfCountersOperationsInOneSession", async function () {
        {
            const session = store.openSession();
            for (const n of [ 1, 2 ]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("downloads", 100);
            session.countersFor("users/2-A").increment("votes", 1000);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").delete("downloads");
            session.countersFor("users/2-A").increment("votes", -600);
            await session.saveChanges();
        }

        {
            const session = store.openSession();

            let val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isEqualTo(200);

            val = await session.countersFor("users/1-A").get("downloads");
            assertThat(val)
                .isNull();

            val = await session.countersFor("users/2-A").get("votes");
            assertThat(val)
                .isEqualTo(400);
        }

    });

    it("shouldThrow", async function () {
        {
            const session = store.openSession();
            for (const n of [ 1 ]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            session.countersFor(user).increment("likes", 100);
            await session.saveChanges();

            assertThat(await session.countersFor(user).get("likes"))
                .isEqualTo(100);
        }
    });

    it("sessionShouldTrackCounters", async function () {
        {
            const session = store.openSession();
            for (const n of [ 1 ]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            session.countersFor("users/1-A").increment("likes", 100);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            assertThat(session.advanced.numberOfRequests)
                .isZero();

            const val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isEqualTo(100);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            session.countersFor("users/1-A").get("likes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

    });

    it("sessionShouldKeepNullsInCountersCache", async function () {
        {

            const session = store.openSession();
            for (const n of [1]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let val = await session.countersFor("users/1-A").get("score");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(val)
                .isNull();

            val = await session.countersFor("users/1-A").get("score");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(val)
                .isNull();

            const dic = await session.countersFor("users/1-A").getAll();
            // should not contain null value for "score"

            assertThat(session.advanced.numberOfRequests).isEqualTo(2);
            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);
        }

    });

    it("sessionShouldKnowWhenItHasAllCountersInCacheAndAvoidTripToServer_WhenUsingEntity", async function () {
        {
            const session = store.openSession();
            for (const n of [1]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            assertThat(session.advanced.numberOfRequests)
                        .isEqualTo(1);

            const userCounters = session.countersFor(user);

            let val = await userCounters.get("likes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(val)
                .isEqualTo(100);

            val = await userCounters.get("dislikes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(val)
                .isEqualTo(200);

            val = await userCounters.get("downloads");
            // session should know at this point that it has all counters

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(val)
                .isEqualTo(300);

            const dic = await userCounters.getAll(); // should not go to server
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);

            val = await userCounters.get("score"); //should not go to server
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(val)
                .isNull();
        }
    });

    it("sessionShouldUpdateMissingCountersInCacheAndRemoveDeletedCounters_AfterRefresh", async function () {
        {
            const session = store.openSession();
            for (const n of [1]) {
                await storeDoc(session, `users/${n}-A`, { name: `Aviv${n}` }, User);
            }
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const user = await session.load("users/1-A");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const userCounters = session.countersFor(user);
            let dic = await userCounters.getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);

            {
                const session2 = store.openSession();
                session2.countersFor("users/1-A").increment("likes");
                session2.countersFor("users/1-A").delete("dislikes");
                session2.countersFor("users/1-A").increment("score", 1000); // new counter
                await session2.saveChanges();
            }

            await session.advanced.refresh(user);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

                // Refresh updated the document in session,
                // cache should know that it's missing 'score' by looking
                // at the document's metadata and go to server again to get all.
                // this should override the cache entirely and therefor
                // 'dislikes' won't be in cache anymore

            dic = await userCounters.getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 101)
                .containsEntry("downloads", 300)
                .containsEntry("score", 1000);

            // cache should know that it got all and not go to server,
            // and it shouldn't have 'dislikes' entry anymore
            const val = await userCounters.get("dislikes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(val)
                .isNull();
        }

    });

    it("sessionShouldUpdateMissingCountersInCacheAndRemoveDeletedCounters_AfterLoadFromServer", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/${1}-A`, { name: `Aviv${1}` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);

            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const userCounters = session.countersFor("users/1-A");
            let dic = await userCounters.getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);

            {
                const session2 = store.openSession();
                session2.countersFor("users/1-A").increment("likes");
                session2.countersFor("users/1-A").delete("dislikes");
                session2.countersFor("users/1-A").increment("score", 1000); // new counter
                await session2.saveChanges();
            }

            const user = await session.load("users/1-A");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            // Refresh updated the document in session,
            // cache should know that it's missing 'score' by looking
            // at the document's metadata and go to server again to get all.
            // this should override the cache entirely and therefor
            // 'dislikes' won't be in cache anymore

            dic = await userCounters.getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 101)
                .containsEntry("downloads", 300)
                .containsEntry("score", 1000);

            // cache should know that it got all and not go to server,
            // and it shouldn't have 'dislikes' entry anymore
            const val = await userCounters.get("dislikes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(val)
                .isNull();
        }

    });

    it("sessionClearShouldClearCountersCache", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/${1}-A`, { name: `Aviv${1}` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);

            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const userCounters = session.countersFor("users/1-A");
            let dic = await userCounters.getAll();
            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);

            {
                const session2 = store.openSession();
                session2.countersFor("users/1-A").increment("likes");
                session2.countersFor("users/1-A").delete("dislikes");
                session2.countersFor("users/1-A").increment("score", 1000); // new counter
                await session2.saveChanges();
            }

            session.advanced.clear(); // should clear countersCache

            dic = await userCounters.getAll(); // should go to server again
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 101)
                .containsEntry("downloads", 300)
                .containsEntry("score", 1000);

        }
    });

    it("sessionEvictShouldRemoveEntryFromCountersCache", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/${1}-A`, { name: `Aviv${1}` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);

            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const userCounters = session.countersFor("users/1-A");
            let dic = await userCounters.getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);

            {
                const session2 = store.openSession();
                session2.countersFor("users/1-A").increment("likes");
                session2.countersFor("users/1-A").delete("dislikes");
                session2.countersFor("users/1-A").increment("score", 1000); // new counter
                await session2.saveChanges();
            }

            session.advanced.evict(user);  // should remove 'users/1-A' entry from CountersByDocId

            dic = await userCounters.getAll(); // should go to server again
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 101)
                .containsEntry("downloads", 300)
                .containsEntry("score", 1000);
        }
    });

    it("sessionShouldAlwaysLoadCountersFromCacheAfterGetAll", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/${1}-A`, { name: `Aviv${1}` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const dic = await session.countersFor("users/1-A").getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(dic)
                .hasSize(3)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300);

            //should not go to server after GetAll() request
            let val = await session.countersFor("users/1-A").get("likes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(val)
                .isEqualTo(100);

            val = await session.countersFor("users/1-A").get("votes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(val)
                .isNull();

        }
    });

    it("sessionShouldOverrideExistingCounterValuesInCacheAfterGetAll", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/${1}-A`, { name: `Aviv${1}` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            session.countersFor("users/1-A").increment("downloads", 300);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            let val = await session.countersFor("users/1-A").get("likes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(val)
                .isEqualTo(100);

            val = await session.countersFor("users/1-A").get("score");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(val)
                .isNull();

            const operation = new DocumentCountersOperation();
            operation.documentId = "users/1-A";
            operation.operations = [CounterOperation.create("likes", "Increment", 400)];

            const counterBatch = new CounterBatch();
            counterBatch.documents = [operation];

            await store.operations.send(new CounterBatchOperation(counterBatch));

            const dic = await session.countersFor("users/1-A").getAll();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(dic)
                .hasSize(3)
                .containsEntry("dislikes", 200)
                .containsEntry("downloads", 300)
                .containsEntry("likes", 500);

            val = await session.countersFor("users/1-A").get("score");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3); // null values should still be in cache
            assertThat(val)
                .isNull();
        }

    });

    it("sessionIncrementCounterShouldUpdateCounterValueAfterSaveChanges", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/1-A`, { name: `Aviv1` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 300);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            let val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isEqualTo(100);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            session.countersFor("users/1-A").increment("likes", 50);  // should not increment the counter value in cache
            val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isEqualTo(100);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            session.countersFor("users/1-A").increment("dislikes", 200);  // should not add the counter to cache
            val = await session.countersFor("users/1-A").get("dislikes"); // should go to server
            assertThat(val)
                .isEqualTo(300);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            session.countersFor("users/1-A").increment("score", 1000);  // should not add the counter to cache
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            // SaveChanges should updated counters values in cache
            // according to increment result
            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            // should not go to server for these
            val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isEqualTo(150);

            val = await session.countersFor("users/1-A").get("dislikes");
            assertThat(val)
                .isEqualTo(500);

            val = await session.countersFor("users/1-A").get("score");
            assertThat(val)
                .isEqualTo(1000);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
        }

    });

    it("sessionShouldRemoveCounterFromCacheAfterCounterDeletion", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/1-A`, { name: `Aviv1` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            let val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isEqualTo(100);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            session.countersFor("users/1-A").delete("likes");
            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isNull();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
        }

    });

    it("sessionShouldRemoveCountersFromCacheAfterDocumentDeletion", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/1-A`, { name: `Aviv1` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const dic = await session.countersFor("users/1-A").get(["likes", "dislikes"]);

            assertThat(dic)
                .hasSize(2)
                .containsEntry("likes", 100)
                .containsEntry("dislikes", 200);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            session.delete("users/1-A");
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            const val = await session.countersFor("users/1-A").get("likes");
            assertThat(val)
                .isNull();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
        }

    });

    it("sessionIncludeSingleCounter", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `users/1-A`, { name: `Aviv1` }, User);
            session.countersFor("users/1-A").increment("likes", 100);
            session.countersFor("users/1-A").increment("dislikes", 200);
            await session.saveChanges();
        }
        {
            const session = store.openSession();

            const user = await session.load("users/1-A", { 
                includes:  i => i.includeCounter("likes") 
            });
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const counter = await session.countersFor(user).get("likes");
            assertThat(counter)
                .isEqualTo(100);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

    });

    it("sessionChainedIncludeCounter", async function () {
        {
            const session = store.openSession();
            await storeDoc(session, `companies/1-A`, { name: `HR` }, Company);
            await storeDoc(session, `orders/1-A`, { company: "companies/1-A" }, Order);
            session.countersFor("orders/1-A").increment("likes", 100);
            session.countersFor("orders/1-A").increment("dislikes", 200);
            await session.saveChanges();
        }
        {
            const session = store.openSession();

            const order = await session.load(
                "orders/1-A", { 
                    includes: i => i.includeCounter("likes")
                                    .includeCounter("dislikes") 
                });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            let counter = await session.countersFor(order).get("likes");
            assertThat(counter)
                .isEqualTo(100);

            counter = await session.countersFor(order).get("dislikes");
            assertThat(counter)
                .isEqualTo(200);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

    });

});

async function storeDoc(session: IDocumentSession, id: string, data: any, clazz: any) {
    await session.store(
        Object.assign(new clazz(), data), id);
}

//     @Test
//     public void sessionChainedIncludeAndIncludeCounter() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");
//                 session.store(company, "companies/1-A");

//                 Employee employee = new Employee();
//                 employee.setFirstName("Aviv");
//                 session.store(employee, "employees/1-A");

//                 Order order = new Order();
//                 order.setCompany("companies/1-A");
//                 order.setEmployee("employees/1-A");
//                 session.store(order, "orders/1-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);
//                 session.countersFor("orders/1-A").increment("downloads", 300);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Order order = session.load(Order.class, "orders/1-A",
//                         i -> i.includeCounter("likes")
//                                 .includeDocuments("company")
//                                 .includeCounter("dislikes")
//                                 .includeCounter("downloads")
//                                 .includeDocuments("employee"));

//                 Company company = session.load(Company.class, order.getCompany());
//                 assertThat(company.getName())
//                         .isEqualTo("HR");

//                 Employee employee = session.load(Employee.class, order.getEmployee());
//                 assertThat(employee.getFirstName())
//                         .isEqualTo("Aviv");

//                 Map<String, Long> dic = session.countersFor(order).getAll();
//                 assertThat(dic)
//                         .hasSize(3)
//                         .containsEntry("likes", 100L)
//                         .containsEntry("dislikes", 200L)
//                         .containsEntry("downloads", 300L);

//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);
//             }
//         }
//     }

//     @Test
//     public void sessionIncludeCounters() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");
//                 session.store(company, "companies/1-A");

//                 Order order = new Order();
//                 order.setCompany("companies/1-A");
//                 session.store(order, "orders/1-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Order order = session.load(Order.class, "orders/1-A", i -> i.includeDocuments("company").includeCounters(new String[]{"likes", "dislikes"}));

//                 Company company = session.load(Company.class, order.getCompany());
//                 assertThat(company.getName())
//                         .isEqualTo("HR");

//                 Map<String, Long> dic = session.countersFor(order).getAll();
//                 assertThat(dic)
//                         .hasSize(2)
//                         .containsEntry("likes", 100L)
//                         .containsEntry("dislikes", 200L);

//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);
//             }

//         }
//     }

//     @Test
//     public void sessionIncludeAllCounters() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");
//                 session.store(company, "companies/1-A");

//                 Order order = new Order();
//                 order.setCompany("companies/1-A");
//                 session.store(order, "orders/1-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);
//                 session.countersFor("orders/1-A").increment("downloads", 300);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Order order = session.load(Order.class, "orders/1-A", i -> i.includeDocuments("company").includeAllCounters());

//                 Company company = session.load(Company.class, order.getCompany());
//                 assertThat(company.getName())
//                         .isEqualTo("HR");

//                 Map<String, Long> dic = session.countersFor(order).getAll();
//                 assertThat(dic)
//                         .hasSize(3)
//                         .containsEntry("likes", 100L)
//                         .containsEntry("dislikes", 200L)
//                         .containsEntry("downloads", 300L);

//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);
//             }

//         }
//     }

//     @Test
//     public void sessionIncludeSingleCounterAfterIncludeAllCountersShouldThrow() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");
//                 session.store(company, "companies/1-A");

//                 Order order = new Order();
//                 order.setCompany("companies/1-A");
//                 session.store(order, "orders/1-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);
//                 session.countersFor("orders/1-A").increment("downloads", 300);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {

//                 assertThatThrownBy(() -> {
//                     session.load(Order.class, "orders/1-A", i -> i.includeDocuments("company").includeAllCounters().includeCounter("likes"));
//                 }).isExactlyInstanceOf(IllegalStateException.class);
//             }
//         }
//     }

//     @Test
//     public void sessionIncludeAllCountersAfterIncludeSingleCounterShouldThrow() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");
//                 session.store(company, "companies/1-A");

//                 Order order = new Order();
//                 order.setCompany("companies/1-A");
//                 session.store(order, "orders/1-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);
//                 session.countersFor("orders/1-A").increment("downloads", 300);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {

//                 assertThatThrownBy(() -> {
//                     session.load(Order.class, "orders/1-A", i -> i.includeDocuments("company").includeCounter("likes").includeAllCounters());
//                 }).isExactlyInstanceOf(IllegalStateException.class);
//             }
//         }
//     }

//     @Test
//     public void sessionIncludeCountersShouldRegisterMissingCounters() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");
//                 session.store(company, "companies/1-A");

//                 Order order = new Order();
//                 order.setCompany("companies/1-A");
//                 session.store(order, "orders/1-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);
//                 session.countersFor("orders/1-A").increment("downloads", 300);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Order order = session.load(Order.class, "orders/1-A",
//                         i -> i.includeDocuments("company")
//                                 .includeCounters(new String[]{"likes", "downloads", "dances"})
//                                 .includeCounter("dislikes")
//                                 .includeCounter("cats"));

//                 Company company = session.load(Company.class, order.getCompany());
//                 assertThat(company.getName())
//                         .isEqualTo("HR");

//                 // should not go to server
//                 Map<String, Long> dic = session.countersFor(order).getAll();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);

//                 assertThat(dic)
//                         .hasSize(5)
//                         .containsEntry("likes", 100L)
//                         .containsEntry("dislikes", 200L)
//                         .containsEntry("downloads", 300L);

//                 //missing counters should be in cache
//                 assertThat(dic.get("dances"))
//                         .isNull();
//                 assertThat(dic.get("cats"))
//                         .isNull();

//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);

//             }
//         }
//     }

//     @Test
//     public void sessionIncludeCountersMultipleLoads() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company1 = new Company();
//                 company1.setName("HR");
//                 session.store(company1, "companies/1-A");

//                 Order order1 = new Order();
//                 order1.setCompany("companies/1-A");
//                 session.store(order1, "orders/1-A");

//                 Company company2 = new Company();
//                 company2.setName("HP");
//                 session.store(company2, "companies/2-A");

//                 Order order2 = new Order();
//                 order2.setCompany("companies/2-A");
//                 session.store(order2, "orders/2-A");

//                 session.countersFor("orders/1-A").increment("likes", 100);
//                 session.countersFor("orders/1-A").increment("dislikes", 200);

//                 session.countersFor("orders/2-A").increment("score", 300);
//                 session.countersFor("orders/2-A").increment("downloads", 400);

//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Map<String, Order> orders = session.load(Order.class, Arrays.asList("orders/1-A", "orders/2-A"), i -> i.includeDocuments("company").includeAllCounters());

//                 Order order = orders.get("orders/1-A");
//                 Company company = session.load(Company.class, order.getCompany());
//                 assertThat(company.getName())
//                         .isEqualTo("HR");

//                 Map<String, Long> dic = session.countersFor(order).getAll();
//                 assertThat(dic)
//                         .hasSize(2)
//                         .containsEntry("likes", 100L)
//                         .containsEntry("dislikes", 200L);

//                 order = orders.get("orders/2-A");
//                 company = session.load(Company.class, order.getCompany());
//                 assertThat(company.getName())
//                         .isEqualTo("HP");

//                 dic = session.countersFor(order).getAll();
//                 assertThat(dic)
//                         .hasSize(2)
//                         .containsEntry("score", 300L)
//                         .containsEntry("downloads", 400L);

//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);
//             }
//         }
//     }     