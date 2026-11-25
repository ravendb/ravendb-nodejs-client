import assert from "node:assert";
import { milliseconds } from "date-fns";
import {
    GetOperationStateOperation,
    IDocumentStore,
    IndexQuery,
    PatchByQueryOperation
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_19693", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can use kill", async () => {
        const session = store.openSession();
        for (let i = 0; i < 100; i++) {
            await session.store(Object.assign(new User(), { name: "John" }));
        }
        await session.saveChanges();

        const operation = await store.operations.send(new PatchByQueryOperation(
            new IndexQuery("from Users update { this.name = 'Jane' }"),
            { allowStale: true, staleTimeout: null, maxOpsPerSecond: 1, retrieveDetails: false }));

        const status = await testContext.waitForValue(async () => {
            const state = await store.maintenance.send(new GetOperationStateOperation(operation.id));
            return state.status;
        }, "InProgress");
        assertThat(status).isEqualTo("InProgress");

        await operation.kill();

        await assert.rejects(operation.waitForCompletion(milliseconds({ seconds: 30 })), { name: "OperationCanceledException" });
    });
});
