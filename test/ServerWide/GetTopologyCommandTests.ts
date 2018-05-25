
import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
    IDocumentStore,
    IRavenResponse,
    ServerNode,
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
        assert.equal(result.nodes.length, 1);

        const node = result.nodes[0];
        assert.equal(node.url, store.urls[0]);
        assert.equal(node.database, store.database);
        assert.equal(node.clusterTag, "A");
        assert.equal(node.serverRole, "Member" as ServerNodeRole);
    });
});
