import assert from "node:assert";
import { IDocumentStore, IndexDefinition, PutIndexesOperation } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_20724", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("checkIfUnrecognizedIndexConfigurationKeyThrowsException", async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "DummyIndex";
        indexDefinition.maps = new Set(["from dto in docs.Dtos select new { DummyValue = 1 }"]);
        indexDefinition.configuration = {
            "Indexing.Metrics.Enabled": "true",
            "blabla1": "blabla2"
        };

        await assert.rejects(
            () => store.maintenance.send(new PutIndexesOperation(indexDefinition)),
            (error: Error) => {
                assert.strictEqual(error.name, "IndexCreationException");
                assert.ok(error.message.includes(
                    "Could not create index 'DummyIndex' because the configuration option key 'blabla1' is not recognized"));
                return true;
            });
    });
});
