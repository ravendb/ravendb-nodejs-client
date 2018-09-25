import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {IDocumentStore} from "../../src";
import {User} from "../Assets/Entities";
import {CONSTANTS} from "../../src/Constants";

describe("RevisionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can handle revisions", async () => {
        await testContext.setupRevisions(store, false, 4);

        for (let i  = 0; i < 4; i++) {
            const session = store.openSession();

            const user = new User();
            user.name = "user" + (i + 1);
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const allRevisions = await session.advanced.revisions.getFor<User>("users/1");
            assert.strictEqual(allRevisions.length, 4);
            assert.strictEqual(allRevisions[0].name, "user4");
            assert.strictEqual(allRevisions[1].name, "user3");
            assert.strictEqual(allRevisions[2].name, "user2");
            assert.strictEqual(allRevisions[3].name, "user1");

            const revisionsSkipFirst = await session.advanced.revisions.getFor<User>("users/1", { start: 1 });
            assert.strictEqual(revisionsSkipFirst.length, 3);
            assert.strictEqual(revisionsSkipFirst[0].name, "user3");
            assert.strictEqual(revisionsSkipFirst[1].name, "user2");
            assert.strictEqual(revisionsSkipFirst[2].name, "user1");

            const revisionsSkipFirstTakeTwo = await session.advanced.revisions.getFor<User>(
                "users/1", { start: 1, pageSize: 2 });
            assert.strictEqual(revisionsSkipFirstTakeTwo.length, 2);
            assert.strictEqual(revisionsSkipFirstTakeTwo[0].name, "user3");
            assert.strictEqual(revisionsSkipFirstTakeTwo[1].name, "user2");

            const allMetadata = await session.advanced.revisions.getMetadataFor("users/1");
            assert.strictEqual(allMetadata.length, 4);

            const metadataSkipFirst = await session.advanced.revisions.getMetadataFor("users/1", { start: 1 });
            assert.strictEqual(metadataSkipFirst.length, 3);

            const metadataSkipFirstTakeTwo = await session.advanced.revisions
                .getMetadataFor("users/1", { start: 1, pageSize: 2 });
            assert.strictEqual(metadataSkipFirstTakeTwo.length, 2);

            const user = await session.advanced.revisions
                .get<User>(metadataSkipFirst[0][CONSTANTS.Documents.Metadata.CHANGE_VECTOR]);
            assert.strictEqual(user.name, "user3");
        }
    });

});
