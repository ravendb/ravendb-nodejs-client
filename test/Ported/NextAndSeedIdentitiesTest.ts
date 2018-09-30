import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    NextIdentityForCommand,
    SeedIdentityForCommand,
    GetIdentitiesOperation,
} from "../../src";
import { User } from "../Assets/Entities";

describe("NextAndSeedIdentitiesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("NextIdentityForCommand should use one ID from pool", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { lastName: "Adi" });
            await session.store(user, "users|");
            await session.saveChanges();
        }

        const command = new NextIdentityForCommand("users");
        await store.getRequestExecutor().execute(command);

        {
            const session = store.openSession();
            const user = Object.assign(new User(), { lastName: "Avivi" });
            await session.store(user, "users|");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const entityWithId1 = await session.load<User>("users/1");
            const entityWithId2 = await session.load<User>("users/2");
            const entityWithId3 = await session.load<User>("users/3");
            const entityWithId4 = await session.load<User>("users/4");

            assert.ok(entityWithId1);
            assert.ok(entityWithId3);

            assert.ok(!entityWithId2);
            assert.ok(!entityWithId4);

            assert.strictEqual(entityWithId1.lastName, "Adi");
            assert.strictEqual(entityWithId3.lastName, "Avivi");
        }
    });

    it("SeedIdentityForCommand should set identity for given string", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { lastName: "Adi" });
            await session.store(user, "users|");
            await session.saveChanges();
        }

        let command = new SeedIdentityForCommand("users", 1990);
        await store.getRequestExecutor().execute(command);
        let result = command.result;
        assert.strictEqual(result, 1990);

        {
            const session = store.openSession();
            const user = Object.assign(new User(), { lastName: "Avivi" });
            await session.store(user, "users|");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const entityWithId1 = await session.load<User>("users/1");
            const entityWithId2 = await session.load<User>("users/2");
            const entityWithId1990 = await session.load<User>("users/1990");
            const entityWithId1991 = await session.load<User>("users/1991");
            const entityWithId1992 = await session.load<User>("users/1992");

            assert.ok(entityWithId1);
            assert.ok(entityWithId1991);

            assert.ok(!entityWithId2);
            assert.ok(!entityWithId1992);
            assert.ok(!entityWithId1990);

            assert.strictEqual(entityWithId1.lastName, "Adi");
            assert.strictEqual(entityWithId1991.lastName, "Avivi");
        }

        command = new SeedIdentityForCommand("users", 1975);
        await store.getRequestExecutor().execute(command);
        result = command.result;
        assert.strictEqual(result, 1991);

        const identities = await store.maintenance.send(new GetIdentitiesOperation());
        assert.strictEqual(identities["users|"], 1991);
    });
    
});
