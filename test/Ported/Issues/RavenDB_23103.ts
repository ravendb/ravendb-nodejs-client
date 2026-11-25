import assert from "node:assert";
import { milliseconds } from "date-fns";
import {
    AbstractCsharpIndexCreationTask,
    AbstractCsharpMultiMapIndexCreationTask,
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

    it("wait for indexes after patch static index without timeout with specific indexes", async () => {
        await patchNames({ waitForSpecificIndexes: [index.getIndexName()], throwOnTimeoutInWaitForIndexes: true });

        assert.strictEqual(await countByName("Name2"), numberOfCompanies);
    });

    it("wait for indexes after patch static index without timeout no specific indexes", async () => {
        await patchNames({ throwOnTimeoutInWaitForIndexes: true });

        assert.strictEqual(await countByName("Name2"), numberOfCompanies);
    });
});

describe("RavenDB_23103", function () {

    const numberOfCompanies = 1024;
    let index: CompaniesAndCustomers_ByName;
    let store: IDocumentStore;

    beforeEach(async function () {
        index = new CompaniesAndCustomers_ByName();
        store = await testContext.getDocumentStore();

        await index.execute(store);

        const session = store.openSession();
        for (let i = 0; i < numberOfCompanies; i++) {
            await session.store(Object.assign(new Company(), { name: "Name1" }), "Companies/" + i);
            await session.store(Object.assign(new Employee(), { name: "Name1" }), "Employee/" + i);
        }
        await session.saveChanges();

        await testContext.waitForIndexing(store);
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    async function patch(rql: string, indexPatchOptions: IndexPatchOptions) {
        const operation = await store.operations.send(new PatchByQueryOperation(new IndexQuery(rql),
            { allowStale: true, retrieveDetails: true, indexPatchOptions } as QueryOperationOptions));
        await operation.waitForCompletion();
    }

    async function countByName(name: string) {
        const session = store.openSession();
        return session.query({ indexName: index.getIndexName() }).whereEquals("name", name).count();
    }

    it("patch twice should wait on first but not on second on multi map index", async () => {
        const indexPatchOptions: IndexPatchOptions = {
            waitForIndexesTimeout: milliseconds({ seconds: 30 }),
            throwOnTimeoutInWaitForIndexes: true
        };

        await patch(`from index '${index.getIndexName()}' as x update { x.name = 'Name2' ; x.firstName = 'Name2'}`, indexPatchOptions);

        assert.strictEqual(await countByName("Name2"), 2 * numberOfCompanies);

        indexPatchOptions.waitForIndexesTimeout = 0;

        await patch(`from index '${index.getIndexName()}' as x update { x.name = 'Name2'; x.firstName = 'Name2' }`, indexPatchOptions);
    });

    it("patch twice should wait on first but not on second and update only one collection on multi map index", async () => {
        const indexPatchOptions: IndexPatchOptions = {
            waitForIndexesTimeout: milliseconds({ minutes: 3 }),
            throwOnTimeoutInWaitForIndexes: true
        };

        const rql = `from index '${index.getIndexName()}' as x where x.collection == 'Companies' update { x.name = 'Name2' }`;
        await patch(rql, indexPatchOptions);

        assert.strictEqual(await countByName("Name2"), numberOfCompanies);

        indexPatchOptions.waitForIndexesTimeout = 0;

        await patch(rql, indexPatchOptions);
    });
});

class Company {
    public id: string;
    public name: string;
}

class Employee {
    public id: string;
    public name: string;
    public lastName: string;
}

class CompaniesAndCustomers_ByName extends AbstractCsharpMultiMapIndexCreationTask {
    public constructor() {
        super();

        this.addMap(`from c in docs.Companies select new { name = c.name, collection = "Companies" }`);
        this.addMap(`from c in docs.Employees select new { name = c.name, collection = "Employees" }`);
    }
}

class Companies_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from c in docs.Companies select new { c.name }";
    }
}
