import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../src";
import { User } from "../Assets/Entities";

describe("TrackEntityTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("deletingEntityThatIsNotTrackedShouldThrow", async () => {
        const session = store.openSession();
        try {
            session.delete(new User());
            assert.fail("Should have thrown.");
        } catch (err) {
            assert.equal(err.name, "InvalidOperationException");
            assert.ok(err.message.includes(
                "is not associated with the session, cannot delete unknown entity instance"));
        }
    });

    it("loadingDeletedDocumentShouldReturnNull", async () => {
        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "John";
            user1.id = "users/1";

            const user2 = new User();
            user2.name = "Jonathan";
            user2.id = "users/2";

            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.delete("users/1");
            await session.delete("users/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            assert.equal(await session.load("users/1"), null);
            assert.equal(await session.load("users/2"), null);
        }
    });

    it("storingDocumentWithTheSameIdInTheSameSessionShouldThrow", async () => {
        const session = store.openSession();
        const user = new User();
        user.id = "users/1";
        user.name = "User1";

        await session.store(user);
        await session.saveChanges();

        const newUser = new User();
        newUser.name = "User2";
        newUser.id = "users/1";

        try {
            await session.store(newUser);
            assert.fail("Should have thrown.");
        } catch (err) {
            assert.equal(err.name, "NonUniqueObjectException");
            assert.ok(err.message.includes("Attempted to associate a different object with id 'users/1'"));
        }
    });
});
