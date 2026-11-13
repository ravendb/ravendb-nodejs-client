import assert from "node:assert";
import {
    DeleteIndexOperation,
    GetIndexOperation,
    IDocumentStore,
    IndexDefinition,
    IndexLockMode,
    PutIndexesOperation,
    SetIndexesLockOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class Dto {
    public name: string;
}

describe("RavenDB_19239", function () {

    const indexName = "DummyIndex";

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function createIndexLockedWith(mode: IndexLockMode) {
        const session = store.openSession();
        await session.store(Object.assign(new Dto(), { name: "Name1" }));
        await session.store(Object.assign(new Dto(), { name: "Name2" }));
        await session.saveChanges();

        const indexDefinition = new IndexDefinition();
        indexDefinition.name = indexName;
        indexDefinition.maps = new Set(["from order in docs.Dtos select new { Name = order.Name + \"_new\" }"]);

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));
        await testContext.waitForIndexing(store);

        await store.maintenance.send(new SetIndexesLockOperation(indexName, mode));
    }

    it("testLockedError", async () => {
        await createIndexLockedWith("LockedError");

        await assert.rejects(
            () => store.maintenance.send(new DeleteIndexOperation(indexName)),
            { name: "IndexDeletionException" });
    });

    it("testLockedIgnore", async () => {
        await createIndexLockedWith("LockedIgnore");

        await store.maintenance.send(new DeleteIndexOperation(indexName));

        const indexDefinition = await store.maintenance.send(new GetIndexOperation(indexName));
        assert.ok(indexDefinition);
    });

    it("testUnlock", async () => {
        await createIndexLockedWith("Unlock");

        await store.maintenance.send(new DeleteIndexOperation(indexName));

        const indexDefinition = await store.maintenance.send(new GetIndexOperation(indexName));
        assert.ok(!indexDefinition);
    });
});
