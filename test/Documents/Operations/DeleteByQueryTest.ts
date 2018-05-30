import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    IndexQuery,
    DeleteByQueryOperation,
} from "../../../src";
import { User } from "../../Assets/Entities";

describe("DeleteByQueryTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can delete by query", async () => {
        {
            const session = store.openSession();
            const user1 = Object.assign(new User(), { age: 5 });
            await session.store(user1);

            const user2 = Object.assign(new User(), { age: 10 });
            await session.store(user2);

            await session.saveChanges();
        }

        const indexQuery = new IndexQuery();
        indexQuery.query = "from users where age == 5";
        const operation = new DeleteByQueryOperation(indexQuery);
        const asyncOp = await store.operations.send(operation);

        await asyncOp.waitForCompletion();

        {
            const session = store.openSession();
            assert.equal(await session.query(User).count(), 1);
        }
    });
});
