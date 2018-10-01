import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    DeleteDocumentCommand,
    GetStatisticsOperation, IDocumentSession,
    IDocumentStore, IMetadataDictionary,
} from "../../../src";
import { User } from "../../Assets/Entities";
import { PutAttachmentOperation } from "../../../src/Documents/Operations/Attachments/PutAttachmentOperation";
import { CONSTANTS } from "../../../src/Constants";

describe("AttachmentsRevisions", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can put attachments", async () => {
        await testContext.setupRevisions(store, false, 4);

        const names = await createDocumentWithAttachments();

        await assertRevisions(names, (session, revisions) => {
            assertRevisionAttachments(names, 3, revisions[0], session);
            assertRevisionAttachments(names, 2, revisions[1], session);
            assertRevisionAttachments(names, 1, revisions[2], session);
            assertNoRevisionAttachment(revisions[3], session, false);
        }, 9);

        // Delete document should delete all the attachments
        await store.getRequestExecutor().execute(new DeleteDocumentCommand("users/1"));
        await assertRevisions(names, (session, revisions) => {
            assertNoRevisionAttachment(revisions[0], session, true);
            assertRevisionAttachments(names, 3, revisions[1], session);
            assertRevisionAttachments(names, 2, revisions[2], session);
            assertRevisionAttachments(names, 1, revisions[3], session);
        }, 6, 0, 3);

        // Create another revision which should delete old revision
        {
            // This will delete the revision #1 which is without attachment
            const session = store.openSession();
            const user = new User();
            user.name = "Fitzchak 2";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        await assertRevisions(names, (session, revisions) => {
            // This will delete the revision #2 which is with attachment
            assertNoRevisionAttachment(revisions[0], session, false);
            assertNoRevisionAttachment(revisions[1], session, true);
            assertRevisionAttachments(names, 3, revisions[2], session);
            assertRevisionAttachments(names, 2, revisions[3], session);
        }, 5, 1, 3);

        {
            // This will delete the revision #2 which is with attachment
            const session = store.openSession();
            const user = new User();
            user.name = "Fitzchak 3";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        await assertRevisions(names, (session, revisions) => {
            // This will delete the revision #2 which is with attachment
            assertNoRevisionAttachment(revisions[0], session, false);
            assertNoRevisionAttachment(revisions[1], session, false);
            assertNoRevisionAttachment(revisions[2], session, true);
            assertRevisionAttachments(names, 3, revisions[3], session);
        }, 3, 1, 3);

        {
            // This will delete the revision #3 which is with attachment
            const session = store.openSession();
            const user = new User();
            user.name = "Fitzchak 4";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        await assertRevisions(names, (session, revisions) => {
            // This will delete the revision #3 which is with attachment
            assertNoRevisionAttachment(revisions[0], session, false);
            assertNoRevisionAttachment(revisions[1], session, false);
            assertNoRevisionAttachment(revisions[2], session, false);
            assertNoRevisionAttachment(revisions[3], session, true);
        }, 0, 1, 0);

        {
            // This will delete the revision #4 which is with attachment
            const session = store.openSession();
            const user = new User();
            user.name = "Fitzchak 5";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        await assertRevisions(names, (session, revisions) => {
            // This will delete the revision #3 which is with attachment
            assertNoRevisionAttachment(revisions[0], session, false);
            assertNoRevisionAttachment(revisions[1], session, false);
            assertNoRevisionAttachment(revisions[2], session, false);
            assertNoRevisionAttachment(revisions[3], session, false);
        }, 0, 1, 0);
    });

    it("attachment revision", async () => {
        await testContext.setupRevisions(store, false, 4);

        const names = await createDocumentWithAttachments();

        {
            const session = store.openSession();
            const stream = Buffer.from([5, 4, 3, 2, 1]);

            session.advanced.attachments.store("users/1", "profile.png", stream);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revisions = await session.advanced.revisions.getFor<User>("users/1");

            const changeVector = session.advanced.getChangeVectorFor(revisions[1]);

            const revision = await session.advanced.attachments.getRevision("users/1", "profile.png", changeVector);

            try {
                const data = revision.data.read(3);
                assert.strictEqual(data[0], 1);
                assert.strictEqual(data[1], 2);
                assert.strictEqual(data[2], 3);
            } finally {
                revision.dispose();
            }
        }
    });

    const createDocumentWithAttachments = async () => {
        {
            const session = store.openSession();

            const user = new User();
            user.name = "Fitzchak";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        const names = ["profile.png",
            "background-photo.jpg",
            "fileNAME_#$1^%_בעברית.txt"];

        const profileStream = Buffer.from([1, 2, 3]);
        let result = await store.operations.send(
            new PutAttachmentOperation("users/1", names[0], profileStream, "image/png"));

        assert.ok(result.changeVector.includes("A:3"));
        assert.strictEqual(result.name, names[0]);
        assert.strictEqual(result.documentId, "users/1");
        assert.strictEqual(result.contentType, "image/png");

        const backgroundStream = Buffer.from([10, 20, 30, 40, 50]);
        result = await store.operations.send(
            new PutAttachmentOperation("users/1", names[1], backgroundStream, "ImGgE/jPeG"));
        assert.ok(result.changeVector.includes("A:7"));
        assert.strictEqual(result.name, names[1]);
        assert.strictEqual(result.documentId, "users/1");
        assert.strictEqual(result.contentType, "ImGgE/jPeG");

        const fileStream = Buffer.from([1, 2, 3, 4, 5]);
        result = await store.operations.send(
            new PutAttachmentOperation("users/1", names[2], fileStream, null));
        assert.ok(result.changeVector.includes("A:12"));
        assert.strictEqual(result.name, names[2]);
        assert.strictEqual(result.documentId, "users/1");
        assert.ok(!result.contentType);

        return names;
    };

    const assertRevisions = async (names: string[],
                                   assertAction: (session: IDocumentSession, users: User[]) => void,
                                   expectedCountOfAttachments: number,
                                   expectedCountOfDocuments = 1,
                                   expectedCountOfUniqueAttachments = 3) => {
        const statistics = await store.maintenance.send(new GetStatisticsOperation());

        assert.strictEqual(statistics.countOfAttachments, expectedCountOfAttachments);
        assert.strictEqual(statistics.countOfUniqueAttachments, expectedCountOfUniqueAttachments);
        assert.strictEqual(statistics.countOfRevisionDocuments, 4);
        assert.strictEqual(statistics.countOfDocuments, expectedCountOfDocuments);
        assert.strictEqual(statistics.countOfIndexes, 0);

        {
            const session = store.openSession();
            const revisions: User[] = await session.advanced.revisions.getFor<User>("users/1");
            assert.strictEqual(revisions.length, 4);

            assertAction(session, revisions);
        }
    };

    const assertNoRevisionAttachment = (revision: User, session: IDocumentSession, isDeleteRevision: boolean) => {
        const metadata = session.advanced.getMetadataFor(revision);
        if (isDeleteRevision) {
            const flags = metadata[CONSTANTS.Documents.Metadata.FLAGS] as string;
            assert.ok(flags.includes("HasRevisions"));
            assert.ok(flags.includes("DeleteRevision"));
        } else {
            const flags = metadata[CONSTANTS.Documents.Metadata.FLAGS] as string;
            assert.ok(flags.includes("HasRevisions"));
            assert.ok(flags.includes("Revision"));
        }

        assert.ok(!metadata[CONSTANTS.Documents.Metadata.ATTACHMENTS]);
    };

    const assertRevisionAttachments =
        (names: string[], expectedCount: number, revision: User, session: IDocumentSession) => {
            const metadata = session.advanced.getMetadataFor(revision);

            const flags = metadata[CONSTANTS.Documents.Metadata.FLAGS] as string;
            assert.ok(flags.includes("HasRevisions"));
            assert.ok(flags.includes("Revision"));
            assert.ok(flags.includes("HasAttachments"));

            const attachments: IMetadataDictionary[] = metadata[CONSTANTS.Documents.Metadata.ATTACHMENTS];
            assert.strictEqual(attachments.length, expectedCount);

            const orderedNames = names.slice(0);
            if (orderedNames.length > expectedCount) {
                orderedNames.length = expectedCount;
            }

            orderedNames.sort();

            for (let i = 0; i < expectedCount; i++) {
                const name = orderedNames[i];
                const attachment = attachments[i];

                assert.strictEqual(attachment.name, name);
            }
        };
});
