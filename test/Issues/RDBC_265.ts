import * as mocha from "mocha";
import * as assert from "assert";
import { User, Company, Order } from "../Assets/Entities";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RavenErrorType,
    IDocumentStore,
    SeedIdentityForCommand,
    GetIdentitiesOperation,
} from "../../src";

describe("RDBC-265", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("sets identity back to 0 only when forced", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { lastName: "Adi" });
            await session.store(user, "users|");
            await session.saveChanges();
            assert.strictEqual(user.id, "users/1");
        }

        let identities = await store.maintenance.send(new GetIdentitiesOperation());
        assert.strictEqual(identities["users|"], 1);

        let command = new SeedIdentityForCommand("users", 0);
        await store.getRequestExecutor().execute(command);

        identities = await store.maintenance.send(new GetIdentitiesOperation());
        assert.strictEqual(identities["users|"], 1);

        command = new SeedIdentityForCommand("users", 0, true);
        await store.getRequestExecutor().execute(command);

        identities = await store.maintenance.send(new GetIdentitiesOperation());
        assert.strictEqual(identities["users|"], 0);

        // the below won't work however
        // due to https://github.com/ravendb/ravendb/blob/v4.1/test/SlowTests/Issues/RavenDB_9576.cs#L14
        // {
        //     const session = store.openSession();
        //     const user = Object.assign(new User(), { lastName: "Avivi" });
        //     await session.store(user, "users|");
        //     await session.saveChanges();
        //     assert.strictEqual(user.id, "users/1");
        // }
    });
});
