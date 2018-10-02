import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation,
    PatchByQueryOperation, PatchOperation,
} from "../../../../src";
import { PatchRequest } from "../../../../src/Documents/Operations/PatchRequest";

describe("AdvancedPatchingTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can test with variables", async () => {

        {
            const session = store.openSession();
            const customType = new CustomType();
            customType.owner = "me";
            await session.store(customType, "customTypes/1");
            await session.saveChanges();
        }

        const patchRequest = new PatchRequest();
        patchRequest.script = "this.owner = args.v1;";
        patchRequest.values = { v1: "not-me" };

        const patchOperation = new PatchOperation("customTypes/1", null, patchRequest);
        await store.operations.send(patchOperation);

        {
            const session = store.openSession();
            const loaded = await session.load<CustomType>("customTypes/1", CustomType);
            assert.strictEqual(loaded.owner, "not-me");
        }
    });

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
            assert.strictEqual(doc["copiedValue"], 1);
        }
    });

    const sampleScript = "this.comments.splice(2, 1);\n" +
        "    this.owner = 'Something new';\n" +
        "    this.value++;\n" +
        "    this.newValue = \"err!!\";\n" +
        "    this.comments = this.comments.map(function(comment) {\n" +
        "        return (comment == \"one\") ? comment + \" test\" : comment;\n" +
        "    });";

    it("can apply basic script as patch", async () => {
        {
            const session = store.openSession();
            const test = new CustomType();
            test.id = "someId";
            test.owner = "bob";
            test.value = 12143;
            test.comments = ["one", "two", "seven"];
            await session.store(test);
            await session.saveChanges();
        }

        await store.operations
            .send(new PatchOperation("someId", null, PatchRequest.forScript(sampleScript)));

        {
            const session = store.openSession();
            const result = await session.load<CustomType>("someId", CustomType);
            assert.strictEqual(result.owner, "Something new");
            assert.strictEqual(result.comments.length, 2);
            assert.strictEqual(result.comments[0], "one test");
            assert.strictEqual(result.comments[1], "two");
            assert.strictEqual(result.value, 12144);
        }
    });

    it("can deserialize modified document", async () => {
        const customType = new CustomType();
        customType.owner = "somebody@somewhere.com";

        {
            const session = store.openSession();
            await session.store(customType, "doc");
            await session.saveChanges();
        }

        const patch1 = new PatchOperation("doc", null, PatchRequest.forScript("this.owner = '123';"));
        let result = await store.operations.send<CustomType>(patch1, null, CustomType);
        assert.strictEqual(result.status, "Patched");
        assert.strictEqual(result.document.owner, "123");

        const patch2 = new PatchOperation("doc", null, PatchRequest.forScript("this.owner = '123';"));
        result = await store.operations.send<CustomType>(patch2, null, CustomType);
        assert.strictEqual(result.status, "NotModified");
        assert.strictEqual(result.document.owner, "123");

    });
});

export class CustomType {
    public id: string;
    public owner: string;
    public value: number;
    public comments: string[];
    public date: Date;
}
