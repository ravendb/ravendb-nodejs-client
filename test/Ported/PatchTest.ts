import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";

import {
    IDocumentStore,
    IndexQuery,
    IOperationResult,
    PatchOperation,
    PatchByQueryOperation,
    PatchRequest
} from "../../src/index.js";
import { User } from "../Assets/Entities.js";
import { Users_ByName } from "./Indexing/IndexesFromClientTest.js";

describe("PatchTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can patch single document", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";

            await session.store(user, "users/1");
            await session.saveChanges();
        }

        const patchOperation = new PatchOperation(
            "users/1",
            null,
            PatchRequest.forScript("this.name = \"Patched\""));
        const status = await store.operations.send<User>(patchOperation);
        assert.strictEqual(status.status, "Patched");

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1");
            assert.strictEqual(user.name, "Patched");
        }
    });

    it("can wait for index after patch", async () => {
        await new Users_ByName().execute(store);
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";

            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.waitForIndexesAfterSaveChanges({
                indexes: ["Users/ByName"]
            });

            const user = await session.load<User>("users/1");
            session.advanced.patch(user, "name", "New Name");
            await session.saveChanges();
        }
    });

    it("can patch multiple documents", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";

            await session.store(user, "users/1");
            await session.saveChanges();

            const count = await session.query(User)
                .countLazily().getValue();
            assert.strictEqual(count, 1);
        }

        const patchOperation = new PatchByQueryOperation("from Users update {  this.name= \"Patched\"  }");
        const op = await store.operations.send(patchOperation);
        await op.waitForCompletion();

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1");
            assert.strictEqual(user.name, "Patched");
        }
    });

    it("throws on invalid script", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";

            await session.store(user, "users/1");
            await session.saveChanges();
        }

        const patchOperation = new PatchByQueryOperation("from Users update { throw 5; }");
        const op = await store.operations.send(patchOperation);
        try {
            await op.waitForCompletion();
        } catch (err) {
            assert.strictEqual(err.name, "JavaScriptException");
            return;
        }

        assert.fail("it should have thrown");
    });

    it("returns the operation result from waitForCompletion", async () => {
        await storeUsers(3);

        const op = await store.operations.send(new PatchByQueryOperation("from Users update { this.name = \"Patched\" }"));
        const result = await op.waitForCompletion<BulkOperationResult>();

        assert.strictEqual(result.total, 3);
    });

    it("throws TimeoutException when the operation does not complete within the timeout", async () => {
        await storeUsers(20);

        const op = await store.operations.send(new PatchByQueryOperation(
            new IndexQuery("from Users update { this.name = \"Patched\" }"),
            { maxOpsPerSecond: 1, allowStale: false, staleTimeout: null, retrieveDetails: false }));
        try {
            await assert.rejects(op.waitForCompletion(100), { name: "TimeoutException" });
        } finally {
            await op.kill();
        }
    });

    async function storeUsers(count: number) {
        const session = store.openSession();
        for (let i = 0; i < count; i++) {
            await session.store(Object.assign(new User(), { name: "RavenDB" }));
        }
        await session.saveChanges();
    }
});

interface BulkOperationResult extends IOperationResult {
    total: number;
}
