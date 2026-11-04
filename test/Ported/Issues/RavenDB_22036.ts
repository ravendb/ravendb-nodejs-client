import assert from "node:assert";
import {
    CONSTANTS,
    GetIndexNamesOperation,
    GetIndexOperation,
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation,
    ResetIndexOperation,
    StartIndexingOperation,
    StopIndexingOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_22036", function () {

    const indexName = "Users/ByName";
    const sideBySideIndexName = CONSTANTS.Documents.Indexing.SIDE_BY_SIDE_INDEX_NAME_PREFIX + indexName;

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function putStoppedIndex() {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = indexName;
        indexDefinition.maps = new Set(["from user in docs.Users select new { user.FirstName }"]);
        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        await store.maintenance.send(new StopIndexingOperation());
    }

    async function getIndexNames() {
        return store.maintenance.send(new GetIndexNamesOperation(0, 2147483647));
    }

    it("creates a side by side index on side by side reset", async () => {
        await putStoppedIndex();

        await store.maintenance.send(new ResetIndexOperation(indexName, "SideBySide"));

        assert.ok(await store.maintenance.send(new GetIndexOperation(sideBySideIndexName)));
        assert.strictEqual((await getIndexNames()).length, 2);

        await store.maintenance.send(new StartIndexingOperation());
        await testContext.waitForIndexing(store);

        assert.strictEqual((await getIndexNames()).length, 1);
    });

    it("does not create a side by side index on in place reset", async () => {
        await putStoppedIndex();

        await store.maintenance.send(new ResetIndexOperation(indexName, "InPlace"));

        assert.ok(!await store.maintenance.send(new GetIndexOperation(sideBySideIndexName)));
        assert.strictEqual((await getIndexNames()).length, 1);
    });

    it("rejects side by side reset of an auto index", async () => {
        const session = store.openSession();
        await session.query({ collection: "Dtos" }).whereEquals("name", "abc").all();
        const [autoIndexName] = await getIndexNames();

        await assert.rejects(
            store.maintenance.send(new ResetIndexOperation(autoIndexName, "SideBySide")),
            (err: Error) => err.message.includes("Side by side index reset is not supported for auto indexes."));
    });
});
