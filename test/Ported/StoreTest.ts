import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    } from "../../src";
import { User } from "../Assets/Entities";

describe("StoreTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("refreshTest", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";
            await session.store(user, "users/1");
            await session.saveChanges();

            {
                const innerSession = store.openSession();
                const innerUser = await innerSession.load<User>("users/1");
                innerUser.name = "RavenDB 4.0";
                await innerSession.saveChanges();
            }

            await session.advanced.refresh(user);

            assert.strictEqual(user.name, "RavenDB 4.0");
        }
    });

    it("storeDocument", async () => {
        const session = store.openSession();
        let user = new User();
        user.name = "RavenDB";
        await session.store(user, "users/1");
        await session.saveChanges();

        user = await session.load<User>("users/1");
        assert.ok(user);
        assert.strictEqual(user.name, "RavenDB");
    });

    it("storeDocuments", async () => {
        const session = store.openSession();
        const user1 = new User();
        user1.name = "RavenDB";
        await session.store(user1, "users/1");

        const user2 = new User();
        user2.name = "Hibernating Rhinos";
        await session.store(user2, "users/2");

        await session.saveChanges();

        const users: { [key: string]: User } = await session.load<User>(["users/1", "users/2"]);
        assert.strictEqual(Object.keys(users).length, 2);
    });

    it("notifyAfterStore", async () => {
        let storeLevelCallBackData: any = null;
        let sessionLevelCallbackData: any = null;

        store.addSessionListener("afterSaveChanges", eventArgs =>
            storeLevelCallBackData = eventArgs.documentMetadata);
        {
            const session = store.openSession();

            session.advanced.on("afterSaveChanges", eventArgs =>
                sessionLevelCallbackData = eventArgs.documentMetadata);

            const user1 = new User();
            user1.name = "RavenDB";
            await session.store(user1, "users/1");
            await session.saveChanges();

            assert.ok(session.advanced.isLoaded("users/1"));
            assert.ok(session.advanced.getChangeVectorFor(user1));
            assert.ok(session.advanced.getLastModifiedFor(user1));
        }

        assert.ok(storeLevelCallBackData);
        assert.strictEqual(storeLevelCallBackData, sessionLevelCallbackData);

        assert.ok(sessionLevelCallbackData);

        const iMetadataDictionary = sessionLevelCallbackData;
        for (const key of Object.keys(iMetadataDictionary)) {
            assert.ok(key);
            assert.ok(iMetadataDictionary[key]);
        }
    });
});
