import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { User } from "../Assets/Entities";

describe("session.exists()", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can tell if doc exists ", async () => {
        {
            const session = store.openSession();
            const idan = Object.assign(new User(), { name: "Idan" });
            const shalom = Object.assign(new User(), { name: "Shalom" });

            await session.store(idan, "users/1");
            await session.store(shalom, "users/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            assert.strictEqual(await session.advanced.exists("users/1"), true);
            assert.strictEqual(await session.advanced.exists("users/10"), false);

            await session.load("users/2", User);
            assert.strictEqual(await session.advanced.exists("users/2"), true);
        }
    });
}); 
