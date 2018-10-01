import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import { User } from "../Assets/Entities";

import {
    IDocumentStore,
    DocumentSession,
} from "../../src";

describe("[RDBC-230] DocumentInfo", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("does deep copy for document to entity", async () => {
        const user = new User();
        user["numbers"] = [66];
        user["stuff"] = { pet: "Sonia" };

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(user.id, User);
            loaded["numbers"][0] = 60;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(user.id, User);
            const docInfo = (session as DocumentSession).documentsByEntity.get(loaded);
            assert.notStrictEqual(docInfo.entity, docInfo.document);
            assert.notStrictEqual(docInfo.entity["stuff"], docInfo.document["stuff"]);
            assert.notStrictEqual(docInfo.entity["numbers"], docInfo.document["numbers"]);
            assert.strictEqual(loaded["numbers"][0], 60);
        }
    });
});
