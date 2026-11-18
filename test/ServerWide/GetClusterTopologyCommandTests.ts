import assert from "node:assert"
import { testContext, disposeTestDocumentStore, ClusterTestContext, RavenTestContext } from "../Utils/TestUtil.js";

import {
    DocumentStore,
    IDocumentStore,
    GetClusterTopologyCommand
} from "../../src/index.js";

describe("GetClusterTopologyCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get topology", async () => {
        const command = new GetClusterTopologyCommand();
        await store.getRequestExecutor().execute(command);
        const result = command.result;

        assert.ok(result);
        assert.ok(result.leader);
        assert.ok(result.nodeTag);
        assert.ok(result.status instanceof Map);

        const topology = result.topology;
        assert.ok(topology);
        assert.strictEqual(topology.constructor.name, "ClusterTopology");
        assert.ok(topology.topologyId);
        assert.strictEqual(Object.keys(topology.members).length, 1);
        assert.strictEqual(Object.keys(topology.watchers).length, 0);
        assert.strictEqual(Object.keys(topology.promotables).length, 0);
        assert.strictEqual(Object.keys(topology.getAllNodes()).length, 1);
    });
});

(RavenTestContext.isPullRequest ? describe.skip : describe)("GetClusterTopologyCommand in a cluster", function () {

    const clusterTestContext = new ClusterTestContext();

    it("reports the status of the other nodes keyed by node tag", async () => {
        const cluster = await clusterTestContext.createRaftCluster(2);
        try {
            const database = clusterTestContext.getDatabaseName();
            const leader = cluster.getInitialLeader();
            const follower = cluster.nodes.find(x => x !== leader);
            await cluster.createDatabase(database, 2, leader.url);

            const getStatus = async (url: string) => {
                const store = new DocumentStore(url, database);
                try {
                    store.conventions.disableTopologyUpdates = true;
                    store.initialize();

                    const command = new GetClusterTopologyCommand();
                    await store.getRequestExecutor().execute(command);
                    return command.result.status;
                } finally {
                    store.dispose();
                }
            };

            const statusOnLeader = await getStatus(leader.url);
            assert.deepStrictEqual([...statusOnLeader.keys()], [follower.nodeTag]);

            const followerStatus = statusOnLeader.get(follower.nodeTag);
            assert.strictEqual(followerStatus.connected, true);
            assert.strictEqual(followerStatus.errorDetails, null);
            assert.strictEqual(typeof followerStatus.lastSentMessage, "string");
            assert.ok(followerStatus.lastMatchingIndex > 0);
            assert.ok(followerStatus.lastSent instanceof Date);
            assert.ok(followerStatus.lastReply instanceof Date);
            assert.ok(followerStatus.lastSent.getFullYear() > 2000);

            const statusOnFollower = await getStatus(follower.url);
            assert.deepStrictEqual([...statusOnFollower.keys()], [leader.nodeTag]);
            assert.ok(statusOnFollower.get(leader.nodeTag).lastSent instanceof Date);
            assert.ok(statusOnFollower.get(leader.nodeTag).lastReply instanceof Date);
        } finally {
            cluster.dispose();
        }
    });
});
