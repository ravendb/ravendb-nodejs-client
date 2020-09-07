import { ClusterTestContext } from "../../Utils/TestUtil";
import { DocumentStore } from "../../../src/Documents/DocumentStore";
import { NextIdentityForOperation } from "../../../src/Documents/Operations/Identities/NextIdentityForOperation";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { Stopwatch } from "../../../src/Utility/Stopwatch";

describe("ClusterOperationTest", function () {

    let testContext = new ClusterTestContext();

    it("nextIdentityForOperationShouldBroadcast", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const database = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName: database
            }, numberOfNodes, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const re = store.getRequestExecutor(database);
                let result = await store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|"));
                assertThat(result)
                    .isEqualTo(1);

                const preferred = await re.getPreferredNode();
                const tag = preferred.currentNode.clusterTag;

                await cluster.executeJsScript(tag, "server.ServerStore.InitializationCompleted.Reset(true);" +
                    " server.ServerStore.Initialized = false; " +
                    " var leader = server.ServerStore.Engine.CurrentLeader; " +
                    " if (leader) leader.StepDown();");

                const sw = Stopwatch.createStarted();
                result = await store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|"));
                sw.stop();

                assertThat(sw.elapsed)
                    .isLessThan(10_000);

                const newPreferred = await re.getPreferredNode();
                assertThat(newPreferred.currentNode.clusterTag)
                    .isNotEqualTo(tag);
                assertThat(result)
                    .isEqualTo(2);
            } finally {
                store.dispose();
            }

        } finally {
            cluster.dispose();
        }
    });

    it("nextIdentityForOperationShouldBroadcastAndFail", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const database = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName: database
            }, numberOfNodes, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const re = store.getRequestExecutor(database);
                let result = await store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|"));
                assertThat(result)
                    .isEqualTo(1);

                const node = cluster.nodes.find(x => !x.leader);

                const leaderNodeTag = await cluster.getCurrentLeader(store);

                await cluster.executeJsScript(node.nodeTag, "server.ServerStore.InitializationCompleted.Reset(true);\n" +
                    " server.ServerStore.Initialized = false;");

                await cluster.disposeServer(leaderNodeTag);

                const sw = Stopwatch.createStarted();
                await assertThrows(() => store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|")), e => {
                    assertThat(e.name)
                        .isEqualTo("AllTopologyNodesDownException");

                    assertThat(e.message)
                        .contains("Could not send command");
                    assertThat(e.message)
                        .contains("there is no leader, and we timed out waiting for one");
                    assertThat(e.message)
                        .contains("failed with timeout after 00:00:30");

                    assertThat(sw.elapsed)
                        .isLessThan(45_000);
                });

            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    }).timeout(60_000);
});