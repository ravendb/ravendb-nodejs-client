import * as assert from "assert";
import * as sinon from "sinon";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import DocumentStore, {
    IDocumentStore,
    GetDatabaseNamesCommand,
} from "../../src";

describe("Compression", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("is active by default", async () => {
        const exec = store.getRequestExecutor();
        const cmd = new GetDatabaseNamesCommand(0, 5);
        const createReqSpy = exec["_createRequest"] = sinon.spy(exec["_createRequest"]);

        await exec.execute(cmd);
        const reqParams = createReqSpy.lastCall.returnValue;
        assert.ok(reqParams.compress);
    });

    it("is turned off on demand", async () => {
        const store2 = new DocumentStore(store.urls, store.database);
        try {
            store2.conventions.useCompression = false;
            assert.ok(store2.conventions.hasExplicitlySetCompressionUsage);
            assert.ok(!store2.conventions.useCompression);

            store2.initialize();

            const exec = store2.getRequestExecutor();
            const cmd = new GetDatabaseNamesCommand(0, 5);
            const createReqSpy = exec["_createRequest"] = sinon.spy(exec["_createRequest"]);

            await exec.execute(cmd);
            const reqParams = createReqSpy.lastCall.returnValue;
            assert.ok(!reqParams.compress);
        } finally {
            if (store2) {
                store2.dispose();
            }
        }
    });
});
