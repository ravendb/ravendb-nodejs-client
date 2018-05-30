import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation,
    PatchByQueryOperation,
} from "../../../../src";

describe("AdvancedPatchingTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    // TBD more patch tests

    it("can create documents if patching applied by index", async () => {
        {
            const session = store.openSession();

            const type1 = Object.assign(new CustomType(), {
                id: "Item/1",
                value: 1
            });

            const type2 = Object.assign(new CustomType(), {
                id: "Item/2",
                value: 2
            });

            await session.store(type1);
            await session.store(type2);
            await session.saveChanges();
        }

        const def1 = new IndexDefinition();
        def1.name = "TestIndex";
        def1.maps = new Set(["from doc in docs.CustomTypes select new { doc.value }"]);

        await store.maintenance.send(new PutIndexesOperation(def1));

        {
            const session = store.openSession();
            await session.advanced
                .documentQuery({
                    indexName: "TestIndex",
                    documentType: CustomType
                })
                .waitForNonStaleResults()
                .all();
        }

        const patch = new PatchByQueryOperation(`from index 'TestIndex' 
                                                where value = 1 
                                                update { 
                                                    put('NewItem/3', {'copiedValue': this.value });
                                                }`);
        const operation = await store.operations.send(patch);
        await operation.waitForCompletion();

        {
            const session = store.openSession();
            const doc: object = await session.load("NewItem/3");
            assert.equal(doc["copiedValue"], "1");
        }
    });
});
export class CustomType {
    public id: string;
    public owner: string;
    public value: number;
    public comments: string[];
    public date: Date;
}