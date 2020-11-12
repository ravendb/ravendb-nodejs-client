import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { GetCountersOperation, IDocumentStore } from "../../../src";
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("BulkInsertCountersTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("incrementCounter", async () => {
        let userId1: string;
        let userId2: string;

        const bulkInsert = store.bulkInsert();
        {
            const user1 = new User();
            user1.name = "Aviv1";

            await bulkInsert.store(user1);
            userId1 = user1.id;

            const user2 = new User();
            user2.name = "Aviv2";
            await bulkInsert.store(user2);
            userId2 = user2.id;

            const counter = bulkInsert.countersFor(userId1);

            await counter.increment("likes", 100);
            await counter.increment("downloads", 500);
            await bulkInsert.countersFor(userId2)
                .increment("votes", 1000);
        }
        await bulkInsert.finish();

        const counters = (await store.operations
            .send(new GetCountersOperation(userId1, ["likes", "downloads"])))
            .counters;

        assertThat(counters)
            .hasSize(2);

        assertThat(counters.find(x => x.counterName === "likes").totalValue)
            .isEqualTo(100);

        assertThat(counters.find(x => x.counterName === "downloads").totalValue)
            .isEqualTo(500);

        const val = await store.operations.send(new GetCountersOperation(userId2, "votes"));

        assertThat(val.counters[0].totalValue)
            .isEqualTo(1000);
    });

    it("addDocumentAfterIncrementCounter", async () => {
        let userId1: string;
        let userId2: string;

        {
            const bulkInsert = store.bulkInsert();
            const user1 = new User();
            user1.name = "Grisha";
            await bulkInsert.store(user1);

            userId1 = user1.id;

            await bulkInsert.finish();
        }

        {
            const bulkInsert = store.bulkInsert();
            const counter = bulkInsert.countersFor(userId1);

            await counter.increment("likes", 100);
            await counter.increment("downloads", 500);

            const user2 = new User();
            user2.name = "Kotler";
            await bulkInsert.store(user2);

            userId2 = user2.id;

            await bulkInsert.countersFor(userId2)
                .increment("votes", 1000);
            await bulkInsert.finish();
        }

        const counters = (await store.operations
            .send(new GetCountersOperation(userId1, ["likes", "downloads"])))
            .counters;

        assertThat(counters)
            .hasSize(2);

        assertThat(counters.find(x => x.counterName === "likes").totalValue)
            .isEqualTo(100);

        assertThat(counters.find(x => x.counterName === "downloads").totalValue)
            .isEqualTo(500);

        const val = await store.operations.send(new GetCountersOperation(userId2, "votes"));

        assertThat(val.counters[0].totalValue)
            .isEqualTo(1000);
    });

    it("incrementCounterInSeparateBulkInserts", async () => {
        let userId1: string;
        let userId2: string;

        {
            const bulkInsert = store.bulkInsert();
            const user1 = new User();
            user1.name = "Aviv1";

            await bulkInsert.store(user1);
            userId1 = user1.id;

            const user2 = new User();
            user2.name = "Aviv2";
            await bulkInsert.store(user2);
            userId2 = user2.id;

            await bulkInsert.finish();
        }
        {
            const bulkInsert = store.bulkInsert();
            const counter = bulkInsert.countersFor(userId1);

            await counter.increment("likes", 100);
            await bulkInsert.countersFor(userId2)
                .increment("votes", 1000);
            await counter.increment("downloads", 500);
            await bulkInsert.finish();
        }

        const counters = (await store.operations
            .send(new GetCountersOperation(userId1, ["likes", "downloads"])))
            .counters;

        assertThat(counters)
            .hasSize(2);

        assertThat(counters.find(x => x.counterName === "likes").totalValue)
            .isEqualTo(100);

        assertThat(counters.find(x => x.counterName === "downloads").totalValue)
            .isEqualTo(500);

        const val = await store.operations.send(new GetCountersOperation(userId2, "votes"));

        assertThat(val.counters[0].totalValue)
            .isEqualTo(1000);
    });

    it("incrementCounterNullId", async () => {
        await assertThrows(() => {
            const bulkInsert = store.bulkInsert();
            bulkInsert.countersFor(null)
                .increment("votes", 1000);
        }, err => {
            assertThat(err.message)
                .contains("Document id cannot be null or empty");
        });
    });

    it("incrementManyCounters", async () => {
        const counterCount = 20_000;

        let userId1: string;

        {
            const bulkInsert = store.bulkInsert();
            const user1 = new User();
            user1.name = "Aviv1";
            await bulkInsert.store(user1);

            userId1 = user1.id;

            const counter = bulkInsert.countersFor(userId1);

            for (let i = 1; i < counterCount + 1; i++) {
                await counter.increment(i.toString(), i);
            }

            await bulkInsert.finish();
        }

        const counters = (await store.operations.send(new GetCountersOperation(userId1))).counters;

        assertThat(counters)
            .hasSize(counterCount);

        for (const counter of counters) {
            assertThat(counter.totalValue)
                .isEqualTo(parseInt(counter.counterName, 10));
        }
    });
});
