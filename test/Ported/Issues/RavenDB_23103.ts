import assert from "node:assert";
import {
    AbstractCsharpIndexCreationTask,
    DeleteByQueryOperation,
    IDocumentStore,
    IndexPatchOptions,
    IndexQuery,
    PatchByQueryOperation,
    QueryOperationOptions
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_23103", function () {

    const numberOfCompanies = 1024;
    let index: Companies_ByName;
    let store: IDocumentStore;

    beforeEach(async function () {
        index = new Companies_ByName();
        testContext.customizeDbRecord = r => r.settings = { "Indexing.MapBatchSize": "128" };
        store = await testContext.getDocumentStore();

        await index.execute(store);

        const bulk = store.bulkInsert();
        for (let i = 0; i < numberOfCompanies; i++) {
            await bulk.store(Object.assign(new Company(), { name: "Name1" }), "Companies/" + i);
        }
        await bulk.finish();

        await testContext.waitForIndexing(store);
    });

    afterEach(async () => {
        testContext.customizeDbRecord = null;
        await disposeTestDocumentStore(store);
    });

    function options(indexPatchOptions: IndexPatchOptions): QueryOperationOptions {
        return { indexPatchOptions } as QueryOperationOptions;
    }

    async function patchNames(indexPatchOptions: IndexPatchOptions) {
        const query = new IndexQuery(`from index '${index.getIndexName()}' as c update { c.name = 'Name2' }`);
        const operation = await store.operations.send(new PatchByQueryOperation(query, options(indexPatchOptions)));
        return operation.waitForCompletion();
    }

    async function countByName(name: string) {
        const session = store.openSession();
        return session.query(Company, Companies_ByName).whereEquals("name", name).count();
    }

    it("patch by query waits for the static index", async () => {
        await patchNames({ waitForIndexesTimeout: 30_000, throwOnTimeoutInWaitForIndexes: true });

        assert.strictEqual(await countByName("Name2"), numberOfCompanies);
    });

    it("patch by query throws when the index wait times out", async () => {
        await assert.rejects(
            patchNames({ waitForIndexesTimeout: 1, throwOnTimeoutInWaitForIndexes: true }),
            { name: "RavenTimeoutException" });
    });

    it("patch by query throws when the wait for specific indexes times out", async () => {
        await assert.rejects(patchNames({
            waitForIndexesTimeout: 1,
            throwOnTimeoutInWaitForIndexes: true,
            waitForSpecificIndexes: [index.getIndexName()]
        }), { name: "RavenTimeoutException" });
    });

    it("patch by query completes without waiting when the timeout should not throw", async () => {
        await patchNames({ waitForIndexesTimeout: 1 });
    });

    it("delete by query waits for the static index", async () => {
        const query = new IndexQuery(`from index '${index.getIndexName()}'`);
        const operation = await store.operations.send(new DeleteByQueryOperation(query,
            options({ waitForIndexesTimeout: 30_000 })));
        await operation.waitForCompletion();

        const session = store.openSession();
        assert.strictEqual(await session.query(Company, Companies_ByName).count(), 0);
    });

    it("delete by query throws when the index wait times out", async () => {
        const query = new IndexQuery(`from index '${index.getIndexName()}'`);
        const operation = await store.operations.send(new DeleteByQueryOperation(query,
            options({ waitForIndexesTimeout: 1, throwOnTimeoutInWaitForIndexes: true })));

        await assert.rejects(operation.waitForCompletion(), { name: "RavenTimeoutException" });
    });
});

class Company {
    public id: string;
    public name: string;
}

class Companies_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from c in docs.Companies select new { c.name }";
    }
}
