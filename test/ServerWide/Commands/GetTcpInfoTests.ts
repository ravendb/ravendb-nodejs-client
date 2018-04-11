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
import { GetTcpInfoCommand } from "../../../src/ServerWide/Commands/GetTcpInfoCommand";

describe("GetTcpInfoCommand", function () {

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
