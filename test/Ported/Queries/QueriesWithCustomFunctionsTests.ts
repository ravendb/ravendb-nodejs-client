import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    PutCompareExchangeValueOperation,
    CmpXchg,
} from "../../../src";
import { User } from "../../Assets/Entities";

describe("Queries with custom functions", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("query cmpxchg where", async () => {
        await store.operations.send(new PutCompareExchangeValueOperation("Tom", "Jerry", 0));
        await store.operations.send(new PutCompareExchangeValueOperation("Hera", "Zeus", 0));
        await store.operations.send(new PutCompareExchangeValueOperation("Gaya", "Uranus", 0));
        await store.operations.send(new PutCompareExchangeValueOperation("Jerry@gmail.com", "users/2", 0));
        await store.operations.send(new PutCompareExchangeValueOperation("Zeus@gmail.com", "users/1", 0));

        {
            const session = store.openSession();

            const jerry = Object.assign(new User(), { name: "Jerry" });
            await session.store(jerry, "users/2");
            await session.saveChanges();

            const zeus = Object.assign(new User(), { name: "Zeus", lastName: "Jerry" });
            await session.store(zeus, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const q = session.advanced
                .documentQuery<User>(User)
                .whereEquals("name", CmpXchg.value("Hera"))
                .whereEquals("lastName", CmpXchg.value("Tom"));

            assert.strictEqual(
                q.getIndexQuery().query, "from Users where name = cmpxchg($p0) and lastName = cmpxchg($p1)");

            const queryResult = await q.all();
            assert.strictEqual(queryResult.length, 1);
            assert.strictEqual(queryResult[0].name, "Zeus");

            const user = await session.advanced
                .documentQuery<User>(User)
                .whereNotEquals("name", CmpXchg.value("Hera"))
                .all();
            assert.strictEqual(user.length, 1);
            assert.strictEqual(user[0].name, "Jerry");

            const users = await session.advanced
                .rawQuery<User>("from Users where name = cmpxchg(\"Hera\")", User)
                .all();
            assert.strictEqual(users.length, 1);
            assert.strictEqual(users[0].name, "Zeus");
        }
    });
});
