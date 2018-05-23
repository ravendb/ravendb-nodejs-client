import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PutCompareExchangeValueOperation,
} from "../../../src";
import { User } from "../../Assets/Entities";
import { CmpXchg } from "../../../src/Documents/Session/CmpXchng";

describe("Queries with custom functions", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("query cmpxchg where", async () => {
        store.operations.send(new PutCompareExchangeValueOperation("Tom", "Jerry", 0));
        store.operations.send(new PutCompareExchangeValueOperation("Hera", "Zeus", 0));
        store.operations.send(new PutCompareExchangeValueOperation("Gaya", "Uranus", 0));
        store.operations.send(new PutCompareExchangeValueOperation("Jerry@gmail.com", "users/2", 0));
        store.operations.send(new PutCompareExchangeValueOperation("Zeus@gmail.com", "users/1", 0));

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

            assert.equal(
                q.getIndexQuery().query, "from Users where name = cmpxchg($p0) and lastName = cmpxchg($p1)");
            
            const queryResult = await q.all();
            assert.equal(queryResult.length, 1);
            assert.equal(queryResult[0].name, "Zeus");


            const user = await session.advanced
                .documentQuery<User>(User)
                .whereNotEquals("name", CmpXchg.value("Hera"))
                .all();
            assert.equal(user.length, 1);
            assert.equal(user[0].name, "Jerry");

            const users = await session.advanced
                .rawQuery<User>("from Users where name = cmpxchg(\"Hera\")", User)
                .all();
            assert.equal(users.length, 1);
            assert.equal(users[0].name, "Zeus");
        }
    });
});
