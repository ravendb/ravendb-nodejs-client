import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {DocumentStore, IDocumentStore} from "../../src";
import {User} from "../Assets/Entities";
import {CONSTANTS} from "../../src/Constants";
import {ConfigureRevisionsOperationResult} from "../../src/Documents/Operations/Revisions/ConfigureRevisionsOperation";
import {GetDocumentsCommand} from "../../src/Documents/Commands/GetDocumentsCommand";

describe("RevisionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can handle revisions", async () => {
        const configurationResult = await testContext.setupRevisions(store, false, 4);
        assert.ok(configurationResult instanceof ConfigureRevisionsOperationResult);
        assert.ok(configurationResult.raftCommandIndex);

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

    it("with key case transform", async () => {
        const configurationResult = await testContext.setupRevisions(store, false, 4);

        let customStore: DocumentStore;
        try {
            customStore = new DocumentStore(store.urls, store.database);
            customStore.conventions.entityFieldNameConvention = "pascal";
            customStore.conventions.remoteEntityFieldNameConvention = "camel";
            customStore.initialize();

            const session = store.openSession();

            const user = {
                Name: "Marcin",
                Age: 30,
                Pet: "users/4"
            };

            await session.store(user, "users/1");
            await session.saveChanges();

            user.Name = "Roman";
            user.Age = 40;
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<{ Name: string, Age: 30}>("users/1");

            assert.strictEqual(revisions.length, 2);
            assert.strictEqual(revisions[0].Name, "Roman");
            assert.strictEqual(revisions[1].Name, "Marcin");
        } finally {
            if (customStore) {
                customStore.dispose();
            }
        }
    });

});
