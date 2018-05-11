import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
    IDocumentStore,
    IRavenResponse, 
    ServerNode, 
    GetClusterTopologyCommand, 
    GetTcpInfoCommand
} from "../../src";

describe("GetTcpInfoCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get TCP info", async () => {
        const command = new GetTcpInfoCommand("test");
        await store.getRequestExecutor().execute(command);
        const result = command.result;

        assert.ok(result);
        assert.ok(result.hasOwnProperty("certificate"));
        assert.ok(!result.certificate);
        assert.ok(result.url);
    });

});
