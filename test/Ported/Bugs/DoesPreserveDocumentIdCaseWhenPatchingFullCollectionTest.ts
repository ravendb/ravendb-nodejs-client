import assert from "node:assert";
import {
    IDocumentStore,
    IndexDefinition,
    IndexQuery,
    PatchByQueryOperation,
    PutIndexesOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("DoesPreserveDocumentIdCaseWhenPatchingFullCollectionTest", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("does preserve document id case when patching full collection", async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "test";
        indexDefinition.maps = new Set(["from doc in docs select new { doc.name }"]);
        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        let documentId: string;
        {
            const session = store.openSession();
            const d = new FooBar();
            await session.store(d);
            await session.saveChanges();

            documentId = session.advanced.getDocumentId(d);
        }
        {
            const session = store.openSession();
            const d = await session.load(documentId, FooBar);

            assert.strictEqual(session.advanced.getDocumentId(d), documentId);
        }

        await testContext.waitForIndexing(store);

        const operation = await store.operations.send(new PatchByQueryOperation(
            new IndexQuery("FROM INDEX 'test' UPDATE { var theid = id(this); this.name = theid ; }")));
        await operation.waitForCompletion();

        const session = store.openSession();
        const d = await session.load(documentId, FooBar);
        assert.strictEqual(d.name, "FooBars/1-A");
    });
});

class FooBar {
    public name: string = null;
}
