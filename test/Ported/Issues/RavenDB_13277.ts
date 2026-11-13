import assert from "node:assert";
import { IDocumentStore, IndexDefinition, PutIndexesOperation } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_13277", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("createIndexWithTheSameLowercasedNameShouldThrow", async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "A";
        indexDefinition.maps = new Set(["from o in docs.Orders select new { Company = o.Company }"]);

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        indexDefinition.name = "a";

        await assert.rejects(
            () => store.maintenance.send(new PutIndexesOperation(indexDefinition)),
            { name: "IndexCreationException" });
    });
});
