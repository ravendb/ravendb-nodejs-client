import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
} from "../../../src";
import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { IRavenResponse } from "../../../src/Types";
import { ServerNode } from "../../../src/Http/ServerNode";
import { GetClusterTopologyCommand } from "../../../src/ServerWide/Commands/GetClusterTopologyCommand";

describe("GetClusterTopologyCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async function () {
        if (!store) {
            return;
        }

        await new Promise(resolve => {
            store.once("executorsDisposed", () => resolve());
            store.dispose();
        });
    });

    it("can get topology", async () => {
        const command = new GetClusterTopologyCommand();
        await store.getRequestExecutor().execute(command);
        const result = command.result;

        assert.ok(result);
        assert.ok(result.leader);
        assert.ok(result.nodeTag);

        const topology = result.topology;
        assert.ok(topology);
        assert.equal(topology.constructor.name, "ClusterTopology");
        assert.ok(topology.topologyId);
        assert.equal(Object.keys(topology.members).length, 1);
        assert.equal(Object.keys(topology.watchers).length, 0);
        assert.equal(Object.keys(topology.promotables).length, 0);
        assert.equal(Object.keys(topology.getAllNodes()).length, 1);
    });
});
