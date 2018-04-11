
import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
} from "../../../src";
import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { IRavenResponse } from "../../../src/Types";
import { ServerNode, ServerNodeRole } from "../../../src/Http/ServerNode";
import { Topology } from "../../../src/Http/Topology";

describe("GetTopologyCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
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
