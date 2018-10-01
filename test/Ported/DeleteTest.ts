import * as assert from "assert";
import {testContext, disposeTestDocumentStore} from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import {User} from "../Assets/Entities";

describe("session.delete()", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can delete document by entity", async () => {
        const session = store.openSession();
        let user: User = Object.assign(new User(), {name: "RavenDB"});
        await session.store(user, "users/1");
        await session.saveChanges();

        user = await session.load<User>("users/1");

        assert.ok(user);

        await session.delete(user);
        await session.saveChanges();

        const nullUser = await session.load("users/1");
        assert.ok(!nullUser);

    });

    it("can delete document by id", async () => {
        const session = store.openSession();
        let user: User = Object.assign(new User(), {name: "RavenDB"});
        await session.store(user, "users/1");
        await session.saveChanges();

        user = await session.load<User>("users/1");

        assert.ok(user);

        await session.delete("users/1");
        await session.saveChanges();

        const nullUser = await session.load("users/1");
        assert.ok(!nullUser);
    });
});
