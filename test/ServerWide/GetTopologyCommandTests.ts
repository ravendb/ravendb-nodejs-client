import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import {
    GetDatabaseTopologyCommand,
    IDocumentStore,
    ServerNodeRole,
    Topology
} from "../../src";

describe("GetTopologyCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get topology", async () => {

        const command = new GetDatabaseTopologyCommand();
        await store.getRequestExecutor().execute(command);
        const result: Topology = command.result;

        assert.ok(result);
        assert.ok(result.constructor.name, "Topology");
        assert.ok(result.etag);
        assert.strictEqual(result.nodes.length, 1);

        const node = result.nodes[0];
        assert.strictEqual(node.url, store.urls[0]);
        assert.strictEqual(node.database, store.database);
        assert.strictEqual(node.clusterTag, "A");
        assert.strictEqual(node.serverRole, "Member" as ServerNodeRole);
    });
});
