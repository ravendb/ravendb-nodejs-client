import assert from "node:assert";
import { DeleteRevisionsOperation, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_17661", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can_Delete_From_Revisions_Bin_When_Revisions_Are_Disabled", async () => {
        const result = await store.maintenance.send(new DeleteRevisionsOperation(["non-existing-id"]));
        assert.strictEqual(result.totalDeletes, 0);
    });
});
