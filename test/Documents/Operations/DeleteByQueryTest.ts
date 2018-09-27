import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    IndexQuery,
    DeleteByQueryOperation, DocumentChange, OperationStatusChange,
} from "../../../src";
import { User } from "../../Assets/Entities";
import {AsyncQueue} from "../../Utils/AsyncQueue";
import {throwError} from "../../../src/Exceptions";

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
            const user2 = Object.assign(new User(), { age: 10 });

            await session.store(user1);
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
            const count = await session.query(User).count();
            assert.equal(count, 1);
        }
    });

    it("can delete by query wait using changes", async () => {
        {
            const session = store.openSession();
            const user1 = new User();
            user1.age = 5;
            await session.store(user1);

            const user2 = new User();
            user2.age = 10;
            await session.store(user2);

            await session.saveChanges();
        }

        const changesList = new AsyncQueue<OperationStatusChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forAllOperations();
        await observable.ensureSubscribedNow();

        const handler = (change: OperationStatusChange) => changesList.push(change);

        try {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            const indexQuery = new IndexQuery();
            indexQuery.query = "from users where age == 5";
            const operation = new DeleteByQueryOperation(indexQuery);
            await store.operations.send(operation);

            const operationChange = await changesList.poll(15000);
            assert.ok(operationChange.operationId);
        } finally {
            observable.off("data", handler);
        }
    });

});
