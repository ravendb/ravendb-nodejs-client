import assert from "node:assert";
import { IDocumentStore, IndexDefinition, PutIndexesOperation } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_13161", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function indexNamed(name: string): IndexDefinition {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = name;
        indexDefinition.maps = new Set(["from doc in docs.Orders select new { Index = doc.Company }"]);
        return indexDefinition;
    }

    it("cannotPutIndexWithNameClash", async () => {
        await assert.rejects(
            () => store.maintenance.send(new PutIndexesOperation(
                indexNamed("Index_With_Name_Clash"),
                indexNamed("Index/With/Name/Clash"))),
            { name: "IndexCreationException" });
    });
});
