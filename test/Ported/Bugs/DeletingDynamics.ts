import assert from "node:assert";
import { IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("DeletingDynamics", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can delete items using dynamic", async () => {
        await store.getRequestExecutor().execute(new PutDocumentCommand("users/1", null, {}));
        await store.getRequestExecutor().execute(new PutDocumentCommand("users/2", null, {}));

        {
            const session = store.openSession();
            const user1 = await session.load("users/1");
            const user2 = await session.load("users/2");

            session.delete(user1);
            session.delete(user2);

            await session.saveChanges();
        }

        const session = store.openSession();
        assert.strictEqual(await session.load("users/1"), null);
        assert.strictEqual(await session.load("users/2"), null);
    });
});
