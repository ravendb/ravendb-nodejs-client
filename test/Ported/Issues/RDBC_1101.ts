import { NodeSelector } from "../../../src/Http/NodeSelector.js";
import { ServerNode, ServerNodeRole } from "../../../src/Http/ServerNode.js";
import { Topology } from "../../../src/Http/Topology.js";
import { UpdateTopologyParameters } from "../../../src/Http/UpdateTopologyParameters.js";
import { DocumentStore, GetDatabaseTopologyCommand } from "../../../src/index.js";
import { delay } from "../../../src/Utility/PromiseUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import {
    createBareRequestExecutor,
    createNoopLogger,
    internals
} from "../../Utils/RequestExecutorInternals.js";
import { ClusterTestContext, RavenTestContext } from "../../Utils/TestUtil.js";

describe("RDBC_1101", function () {

    function createNode(clusterTag: string, serverRole: ServerNodeRole): ServerNode {
        return new ServerNode({
            url: "http://" + clusterTag.toLowerCase() + ".example.com",
            database: "db",
            clusterTag,
            serverRole
        });
    }

    function createExecutorStub(nodes: ServerNode[], failingTags: Set<string> = new Set()) {
        const executor = createBareRequestExecutor();
        const executorInternals = internals(executor);
        const polled: UpdateTopologyParameters[] = [];

        executorInternals._nodeSelector = new NodeSelector(new Topology(1, nodes));
        executorInternals._log = createNoopLogger();

        executor.updateTopology = async (parameters: UpdateTopologyParameters) => {
            polled.push(parameters);
            if (failingTags.has(parameters.node.clusterTag)) {
                throw new Error("Node " + parameters.node.clusterTag + " is down");
            }
            return true;
        };

        return { executorInternals, polled };
    }

    it("serverNode constructor keeps serverRole", () => {
        const node = createNode("A", "Member");
        assertThat(node.serverRole)
            .isEqualTo("Member");
    });

    it("topology timer polls every member node, even while requests are flowing", async () => {
        const { executorInternals, polled } = createExecutorStub([
            createNode("A", "Member"),
            createNode("B", "Member"),
            createNode("C", "Member")
        ]);

        await executorInternals._updateTopologyCallback();

        assertThat(polled.map(x => x.node.clusterTag).join(","))
            .isEqualTo("A,B,C");

        for (const parameters of polled) {
            assertThat(parameters.timeoutInMs)
                .isEqualTo(0);
            assertThat(parameters.debugTag)
                .isEqualTo("timer-callback-node-" + parameters.node.clusterTag);
        }
    });

    it("topology timer skips non-member nodes", async () => {
        const { executorInternals, polled } = createExecutorStub([
            createNode("A", "Member"),
            createNode("B", "Rehab"),
            createNode("C", "Promotable"),
            createNode("D", "Member")
        ]);

        await executorInternals._updateTopologyCallback();

        assertThat(polled.map(x => x.node.clusterTag).join(","))
            .isEqualTo("A,D");
    });

    it("topology timer keeps polling remaining nodes when one fails", async () => {
        const { executorInternals, polled } = createExecutorStub([
            createNode("A", "Member"),
            createNode("B", "Member"),
            createNode("C", "Member")
        ], new Set(["A"]));

        await executorInternals._updateTopologyCallback();

        assertThat(polled.map(x => x.node.clusterTag).join(","))
            .isEqualTo("A,B,C");
    });

    it("topology timer is a no-op without a node selector", async () => {
        const executorInternals = internals(createBareRequestExecutor());
        executorInternals._nodeSelector = null;

        await executorInternals._updateTopologyCallback();
    });
});

(RavenTestContext.isPullRequest ? describe.skip : describe)("RDBC_1101 - cluster", function () {

    let testContext: ClusterTestContext;

    beforeEach(async function () {
        testContext = new ClusterTestContext();
    });

    afterEach(async () => testContext.dispose());

    it("clientShouldFailoverWhenTalkingToLoneDisconnectedNode", async () => {
        const cluster = await testContext.createRaftCluster(3, {
            "Cluster.TimeBeforeMovingToRehabInSec": "1",
            "Cluster.StatsStabilizationTimeInSec": "1"
        });

        try {
            const databaseName = testContext.getDatabaseName();
            await cluster.createDatabase(databaseName, 3, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, databaseName);
            try {
                store.initialize();

                const executor = store.getRequestExecutor(databaseName);

                // make sure we have an updated topology in the executor
                const serverNode = new ServerNode({
                    clusterTag: cluster.getInitialLeader().nodeTag,
                    database: databaseName,
                    url: cluster.getInitialLeader().url
                });

                const updateTopologyParameters = new UpdateTopologyParameters(serverNode);
                updateTopologyParameters.timeoutInMs = 5000;
                updateTopologyParameters.forceUpdate = true;
                await executor.updateTopology(updateTopologyParameters);

                let topology = new Topology();
                while (!topology.nodes || topology.nodes.length !== 3) {
                    const topologyGetCommand = new GetDatabaseTopologyCommand();
                    await executor.execute(topologyGetCommand);
                    topology = topologyGetCommand.result;
                    await delay(50);
                }

                const executorInternals = internals(executor);
                const selector = executorInternals._nodeSelector;

                // kill the node the timer would poll - the preferred one
                const preferredNode = selector.getPreferredNode().currentNode;
                await cluster.disposeServer(cluster.getNodeByUrl(preferredNode.url).nodeTag);

                // wait until the surviving nodes report 2 members + 1 rehab
                const healthyUrl = cluster.getWorkingServer().url;
                await waitForClusterTopologyOnServer(healthyUrl, databaseName, 2, 1);

                // executor still thinks we have 3 members
                const nodesBefore = selector.getTopology().nodes;
                assertThat(nodesBefore.filter(x => x.serverRole === "Member"))
                    .hasSize(3);

                // artificially call the timer func
                await executorInternals._updateTopologyCallback();

                // we expect the topology fetched from the healthy nodes, despite the dead preferred node
                const nodesAfter = executorInternals._nodeSelector.getTopology().nodes;
                assertThat(nodesAfter.filter(x => x.serverRole === "Member"))
                    .hasSize(2);
                assertThat(nodesAfter.filter(x => x.serverRole === "Rehab"))
                    .hasSize(1);
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    });

    async function waitForClusterTopologyOnServer(serverUrl: string, databaseName: string, memberCount: number, rehabCount: number) {
        const tempStore = new DocumentStore(serverUrl, databaseName);
        try {
            tempStore.conventions.disableTopologyUpdates = true;
            tempStore.initialize();

            const value = await ClusterTestContext.waitForValue<[number, number]>(async () => {
                const topologyGetCommand = new GetDatabaseTopologyCommand();
                await tempStore.getRequestExecutor().execute(topologyGetCommand);
                const topo = topologyGetCommand.result;

                return [
                    topo.nodes.filter(x => x.serverRole === "Member").length,
                    topo.nodes.filter(x => x.serverRole === "Rehab").length
                ];
            }, [memberCount, rehabCount], {
                timeout: 60_000,
                equal: (a, b) => a[0] === b[0] && a[1] === b[1]
            });

            assertThat(value[0]).isEqualTo(memberCount);
            assertThat(value[1]).isEqualTo(rehabCount);
        } finally {
            tempStore.dispose();
        }
    }
});
