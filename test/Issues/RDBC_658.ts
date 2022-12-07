import {ClusterTestContext, disposeTestDocumentStore} from "../Utils/TestUtil";
import * as assert from "assert";
import {assertThat} from "../Utils/AssertExtensions";
import {
    AddDatabaseNodeOperation,
    CreateDatabaseOperation, DocumentStore,
    getAllNodesFromTopology,
    IDocumentStore
} from "../../src";

describe("RDBC-658", function () {

    let store: IDocumentStore;
    let testContext: ClusterTestContext;

    beforeEach(async () => testContext = new ClusterTestContext());
    afterEach(async () => testContext.dispose());

    describe("Add database node", function () {

        it("Add random database node", async () => {
            try {
                testContext = new ClusterTestContext();
                const cluster = await testContext.createRaftCluster(3);
                
                const dbName = testContext.getDatabaseName();
                store = new DocumentStore(cluster.getInitialLeader().url, dbName);
                store.initialize();

                // Create database on 1 node out of 3
                const newDatabaseOp = new CreateDatabaseOperation({databaseName: dbName}, 1);
                let result = await store.maintenance.server.send(newDatabaseOp);

                let databaseNodes = getAllNodesFromTopology(result.topology);
                assert.strictEqual(databaseNodes.length, 1);

                // Add random database node
                const addDatabaseNodeOp = new AddDatabaseNodeOperation(dbName);
                result = await store.maintenance.server.send(addDatabaseNodeOp);

                databaseNodes = getAllNodesFromTopology(result.topology);
                
                assert.strictEqual(databaseNodes.length, 2);
                assert.notStrictEqual(databaseNodes[0], databaseNodes[1]);
            } finally {
                await disposeTestDocumentStore(store);
            }
        });

        it("Add specific databases node", async () => {
            try {
                testContext = new ClusterTestContext();
                const cluster = await testContext.createRaftCluster(3);
                
                const dbName = testContext.getDatabaseName();
                store = new DocumentStore(cluster.getInitialLeader().url, dbName);
                store.initialize();

                // Create database on 1 node out of 3
                const newDatabaseOp = new CreateDatabaseOperation({databaseName: dbName}, 1);
                let result = await store.maintenance.server.send(newDatabaseOp);

                let databaseNodes = getAllNodesFromTopology(result.topology);
                assert.strictEqual(databaseNodes.length, 1);
                const databaseNodeTag = databaseNodes[0];

                // Add specific database node
                const newNodeTag = cluster.nodes.find(x => x.nodeTag !== databaseNodeTag).nodeTag;
                const addDatabaseNodeOp = new AddDatabaseNodeOperation(dbName, newNodeTag);
                result = await store.maintenance.server.send(addDatabaseNodeOp);

                databaseNodes = getAllNodesFromTopology(result.topology);
                assert.strictEqual(databaseNodes.length, 2);
                
                assertThat(databaseNodes).contains(databaseNodes[0]);
                assertThat(databaseNodes).contains(databaseNodes[1]);
            } finally {
                await disposeTestDocumentStore(store);
            }
        });
    });
});