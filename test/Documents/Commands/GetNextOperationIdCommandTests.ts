import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../../src";

describe("GetNextOperationIdCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can get next operation ID", async () => {
            const command = new GetNextOperationIdCommand();
            await store.getRequestExecutor().execute(command);
            assert.ok(command.result);
            assert.ok(typeof command.result === "number");
            assert.ok(!isNaN(command.result));
    });
});
