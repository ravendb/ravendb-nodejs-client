import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";

import {
    IDocumentStore,
    GetNodeInfoCommand
} from "../../src/index.js";

describe("GetNodeInfoCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get node info", async () => {
        const command = new GetNodeInfoCommand();
        await store.getRequestExecutor().execute(command);
        const result = command.result;

        assert.ok(result.nodeTag);
        assert.ok(result.numberOfCores > 0);
        assert.ok(result.buildInfo.productVersion);
        assert.match(result.serverId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        assert.strictEqual(result.currentState, "Leader");

        const expectedOsType = { win32: "Windows", linux: "Linux", darwin: "MacOS" }[process.platform];
        assert.strictEqual(result.osInfo.type, expectedOsType);
        assert.ok(result.osInfo.fullName);
        assert.ok(result.osInfo.version);
        assert.strictEqual(result.osInfo.is64Bit, true);
    });
});
