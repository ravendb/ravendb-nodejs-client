import assert from "node:assert"
import { hoursToSeconds } from "date-fns";
import { testContext, disposeTestDocumentStore, ClusterTestContext, RavenTestContext } from "../Utils/TestUtil.js";

import {
    ConfigureExpirationOperation,
    CreateDatabaseOperation,
    DocumentStore,
    IDocumentStore,
    WaitForRaftIndexCommand
} from "../../src/index.js";

describe("WaitForRaftIndexCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("waits for a raft index on the preferred node and on a selected node", async () => {
        const { raftCommandIndex } = await store.maintenance.send(new ConfigureExpirationOperation({
            disabled: false,
            deleteFrequencyInSec: hoursToSeconds(36)
        }));

        const executor = store.getRequestExecutor();
        await executor.execute(new WaitForRaftIndexCommand(raftCommandIndex));

        const { currentNode } = await executor.getPreferredNode();
        await executor.execute(new WaitForRaftIndexCommand(raftCommandIndex, currentNode.clusterTag));

        await assert.rejects(
            async () => executor.execute(new WaitForRaftIndexCommand(raftCommandIndex, "Z")),
            { name: "RequestedNodeUnavailableException" });
    });
});

(RavenTestContext.isPullRequest ? describe.skip : describe)("WaitForRaftIndexCommand in a cluster", function () {

    const clusterContext = new ClusterTestContext();

    it("waits for a raft index on every node", async () => {
        const cluster = await clusterContext.createRaftCluster(3);
        try {
            const database = clusterContext.getDatabaseName();
            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const { raftCommandIndex } = await store.maintenance.server.send(
                    new CreateDatabaseOperation({ databaseName: database }, 3));

                for (const node of cluster.nodes) {
                    await store.getRequestExecutor().execute(new WaitForRaftIndexCommand(raftCommandIndex, node.nodeTag));

                    const { result } = await cluster.executeJsScript(node.nodeTag, "return server.ServerStore.LastRaftCommitIndex");
                    assert.ok(result >= raftCommandIndex);
                }
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    });
});
