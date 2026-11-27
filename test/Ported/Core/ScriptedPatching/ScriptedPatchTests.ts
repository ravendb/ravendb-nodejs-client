import assert from "node:assert";
import { IDocumentStore, IndexQuery, PatchByQueryOperation } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../../Utils/AssertExtensions.js";

describe("ScriptedPatchTests", function () {

    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeDbRecord = null;
        await disposeTestDocumentStore(store);
    });

    async function storeCompany() {
        const session = store.openSession();
        await session.store(Object.assign(new Company(), { name: "The Wall" }), "companies/1");
        await session.saveChanges();
    }

    async function loadCompany() {
        const session = store.openSession();
        return session.load("companies/1", Company);
    }

    it("patching with parameters should work", async () => {
        store = await testContext.getDocumentStore();
        await storeCompany();

        const query = new IndexQuery("from Companies update { this.name = args.name }");
        query.queryParameters = { name: "Jon" } as Record<string, any>;
        const operation = await store.operations.send(new PatchByQueryOperation(query));

        await operation.waitForCompletion();

        const company = await loadCompany();
        assert.strictEqual(company.name, "Jon");
    });

    for (const allowStringCompilation of [false, true]) {
        it(`can allow string compilation (${allowStringCompilation})`, async () => {
            testContext.customizeDbRecord = r => r.settings = { "Patching.AllowStringCompilation": allowStringCompilation.toString() };
            store = await testContext.getDocumentStore();
            testContext.customizeDbRecord = null;
            await storeCompany();

            const operation = await store.operations.send(new PatchByQueryOperation(new IndexQuery(`from Companies update {
                            const script = 'return "Hello World";';
                            const dynoFunc = new Function("doc", script);
                            this.name = dynoFunc(company);
                        }`)));

            if (allowStringCompilation) {
                await operation.waitForCompletion();

                const company = await loadCompany();
                assert.strictEqual(company.name, "Hello World");
            } else {
                await assertThrows(() => operation.waitForCompletion(), err => {
                    assert.strictEqual(err.name, "JavaScriptException");
                    assertThat(err.message).contains("String compilation has been disabled in engine options. You can configure it by modifying the configuration option: 'Patching.AllowStringCompilation'");
                });
            }
        });
    }
});

class Company {
    public name: string;
}
