import { GetReplicationPerformanceStatisticsOperation, IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil.js";
import { ReplicationTestContext } from "../../../Utils/ReplicationTestContext.js";
import { User } from "../../../Assets/Entities.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

describe("ReplicationPerformanceStatisticsTest", function () {

    let store1: IDocumentStore;
    let store2: IDocumentStore;
    let replication: ReplicationTestContext;

    beforeEach(async function () {
        store1 = await testContext.getDocumentStore();
        store2 = await testContext.getDocumentStore();
        replication = new ReplicationTestContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store1);
        await disposeTestDocumentStore(store2);
    });

    async function storeUsers(store: IDocumentStore) {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "John Dow", age: 30 }), "users/1");
        await session.store(Object.assign(new User(), { name: "Jane Dow", age: 31 }), "users/2");
        await session.saveChanges();
    }

    it("returns empty statistics when there is no replication", async () => {
        const stats = await store1.maintenance.send(new GetReplicationPerformanceStatisticsOperation());
        assertThat(stats.outgoing).hasSize(0);
        assertThat(stats.incoming).hasSize(0);
    });

    const licensedIt = RavenTestContext.isPullRequest ? it.skip : it;

    licensedIt("can_get_performance_stats", async () => {
        await replication.setupReplication(store1, store2);
        await storeUsers(store1);

        assertThat(await replication.waitForDocumentToReplicate(store2, "users/1", 15_000, User)).isNotNull();
        assertThat(await replication.waitForDocumentToReplicate(store2, "users/2", 5_000, User)).isNotNull();

        const stats1 = await store1.maintenance.send(new GetReplicationPerformanceStatisticsOperation());
        const stats2 = await store2.maintenance.send(new GetReplicationPerformanceStatisticsOperation());

        assertThat(stats1.outgoing).isNotEmpty();
        assertThat(stats1.incoming).hasSize(0);
        assertThat(stats2.outgoing).hasSize(0);
        assertThat(stats2.incoming).isNotEmpty();

        const outgoing = stats1.outgoing[0];
        assertThat(outgoing.destination).isNotNull();
        assertThat(outgoing.performance).isNotEmpty();
        assertThat(outgoing.performance[0].started instanceof Date).isTrue();

        const incoming = stats2.incoming[0];
        assertThat(incoming.source).isNotNull();
        assertThat(incoming.performance).isNotEmpty();
    });

    licensedIt("automaticResolveWithIdenticalContent", async () => {
        await storeUsers(store1);
        await storeUsers(store2);

        await replication.setupReplication(store1, store2);

        const incomingCount = await testContext.waitForValue(
            async () => (await store2.maintenance.send(new GetReplicationPerformanceStatisticsOperation())).incoming.length, 1);
        assertThat(incomingCount).isEqualTo(1);

        const stats = await store2.maintenance.send(new GetReplicationPerformanceStatisticsOperation());
        const errors = stats.incoming.flatMap(x => x.performance.flatMap(p => p.errors ?? []));
        assertThat(errors).hasSize(0);
    });
});
