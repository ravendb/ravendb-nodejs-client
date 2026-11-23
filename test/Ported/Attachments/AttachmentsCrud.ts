import assert from "node:assert";
import { Readable } from "node:stream";
import {
    AttachmentName,
    CONSTANTS,
    DeleteAttachmentOperation,
    DeleteDocumentCommand,
    GetAttachmentOperation,
    GetStatisticsOperation,
    IDocumentStore,
    PatchOperation,
    PatchRequest,
    PutAttachmentOperation,
    PutDocumentCommand
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("AttachmentsCrud", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function bytesFrom1(count: number): Buffer {
        return Buffer.from(Array.from({ length: count }, (_, i) => (i + 1) & 0xFF));
    }

    async function storeUser(id: string, name: string) {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name }), id);
        await session.saveChanges();
    }

    async function assertAttachmentCount(uniqueAttachmentCount: number, attachmentCount?: number, documentsCount = 1) {
        const statistics = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(statistics.countOfDocuments).isEqualTo(documentsCount);
        assertThat(statistics.countOfRevisionDocuments).isEqualTo(0);
        assertThat(statistics.countOfAttachments).isEqualTo(attachmentCount ?? uniqueAttachmentCount);
        assertThat(statistics.countOfUniqueAttachments).isEqualTo(uniqueAttachmentCount);
    }

    async function loadUserAttachments(id = "users/1") {
        const session = store.openSession();
        const user = await session.load(id, User);
        const metadata = session.advanced.getMetadataFor(user);
        return {
            flags: metadata[CONSTANTS.Documents.Metadata.FLAGS],
            attachments: metadata[CONSTANTS.Documents.Metadata.ATTACHMENTS] as AttachmentName[]
        };
    }

    async function getAttachment(documentId: string, name: string) {
        const session = store.openSession();
        const attachment = await session.advanced.attachments.get(documentId, name);
        if (!attachment) {
            return null;
        }
        try {
            return { details: attachment.details, bytes: Buffer.concat(await attachment.data.toArray()) };
        } finally {
            attachment.dispose();
        }
    }

    it("put attachments", async () => {
        await storeUser("users/1", "Fitzchak");

        const names = ["profile.png", "background-photo.jpg", "fileNAME_#$1^%_בעברית.txt"];

        {
            const result = await store.operations.send(
                new PutAttachmentOperation("users/1", names[0], Buffer.from([1, 2, 3]), "image/png"));
            assertThat(result.changeVector).contains("A:2");
            assertThat(result.name).isEqualTo(names[0]);
            assertThat(result.documentId).isEqualTo("users/1");
            assertThat(result.contentType).isEqualTo("image/png");
            assertThat(result.hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
            assertThat(result.size).isEqualTo(3);
        }
        {
            const result = await store.operations.send(
                new PutAttachmentOperation("users/1", names[1], Buffer.from([10, 20, 30, 40, 50]), "ImGgE/jPeG"));
            assertThat(result.changeVector).contains("A:4");
            assertThat(result.name).isEqualTo(names[1]);
            assertThat(result.documentId).isEqualTo("users/1");
            assertThat(result.contentType).isEqualTo("ImGgE/jPeG");
            assertThat(result.hash).isEqualTo("igkD5aEdkdAsAB/VpYm1uFlfZIP9M2LSUsD6f6RVW9U=");
            assertThat(result.size).isEqualTo(5);
        }
        {
            const result = await store.operations.send(
                new PutAttachmentOperation("users/1", names[2], Buffer.from([1, 2, 3, 4, 5])));
            assertThat(result.changeVector).contains("A:6");
            assertThat(result.name).isEqualTo(names[2]);
            assertThat(result.documentId).isEqualTo("users/1");
            assertThat(result.contentType).isEqualTo("");
            assertThat(result.hash).isEqualTo("Arg5SgIJzdjSTeY6LYtQHlyNiTPmvBLHbr/Cypggeco=");
            assertThat(result.size).isEqualTo(5);
        }

        const { flags, attachments } = await loadUserAttachments();
        assertThat(flags).isEqualTo("HasAttachments");
        assertThat(attachments).hasSize(3);
        const expectedInNameOrder = [
            { name: names[1], hash: "igkD5aEdkdAsAB/VpYm1uFlfZIP9M2LSUsD6f6RVW9U=", size: 5 },
            { name: names[2], hash: "Arg5SgIJzdjSTeY6LYtQHlyNiTPmvBLHbr/Cypggeco=", size: 5 },
            { name: names[0], hash: "EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=", size: 3 }
        ];
        for (let i = 0; i < expectedInNameOrder.length; i++) {
            assertThat(attachments[i].name).isEqualTo(expectedInNameOrder[i].name);
            assertThat(attachments[i].hash).isEqualTo(expectedInNameOrder[i].hash);
            assertThat(attachments[i].size).isEqualTo(expectedInNameOrder[i].size);
        }

        await assertAttachmentCount(3, 3);

        const expected = [
            { bytes: [1, 2, 3], contentType: "image/png", hash: "EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=" },
            { bytes: [10, 20, 30, 40, 50], contentType: "ImGgE/jPeG", hash: "igkD5aEdkdAsAB/VpYm1uFlfZIP9M2LSUsD6f6RVW9U=" },
            { bytes: [1, 2, 3, 4, 5], contentType: "", hash: "Arg5SgIJzdjSTeY6LYtQHlyNiTPmvBLHbr/Cypggeco=" }
        ];
        for (let i = 0; i < names.length; i++) {
            const { details, bytes } = await getAttachment("users/1", names[i]);
            assertThat(details.changeVector).contains("A:" + (2 + 2 * i));
            assertThat(details.name).isEqualTo(names[i]);
            assert.deepStrictEqual([...bytes], expected[i].bytes);
            assertThat(details.contentType).isEqualTo(expected[i].contentType);
            assertThat(details.hash).isEqualTo(expected[i].hash);
            assertThat(details.size).isEqualTo(expected[i].bytes.length);
        }

        assert.strictEqual(await getAttachment("users/1", "not-there"), null);
    });

    async function validateMetadataPutAttachmentAndPutDocumentShouldHaveHasAttachmentsFlag() {
        await assertAttachmentCount(1, 1);

        const { flags, attachments } = await loadUserAttachments();
        assertThat(flags).isEqualTo("HasAttachments");
        assertThat(attachments).hasSize(1);
        assertThat(attachments[0].name).isEqualTo("pic");
        assertThat(attachments[0].hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
        assertThat(attachments[0].contentType).isEqualTo("image/png");
        assertThat(attachments[0].size).isEqualTo(3);
    }

    it("preserve attachments in metadata after put document", async () => {
        await storeUser("users/1", "Fitzchak");
        await store.operations.send(new PutAttachmentOperation("users/1", "pic", Buffer.from([1, 2, 3]), "image/png"));

        await validateMetadataPutAttachmentAndPutDocumentShouldHaveHasAttachmentsFlag();

        await storeUser("users/1", "Fitzchak 2");

        await validateMetadataPutAttachmentAndPutDocumentShouldHaveHasAttachmentsFlag();
    });

    it("preserve attachments in metadata after put document without metadata", async () => {
        await store.getRequestExecutor().execute(
            new PutDocumentCommand("users/1", null, { name: "Fitzchak", "@metadata": { "@collection": "Users" } }));
        await store.operations.send(new PutAttachmentOperation("users/1", "pic", Buffer.from([1, 2, 3]), "image/png"));

        await validateMetadataPutAttachmentAndPutDocumentShouldHaveHasAttachmentsFlag();

        await store.getRequestExecutor().execute(
            new PutDocumentCommand("users/1", null, { name: "Fitzchak 2", "@metadata": { "@collection": "Users" } }));

        await validateMetadataPutAttachmentAndPutDocumentShouldHaveHasAttachmentsFlag();
    });

    for (const [nameAndContentType, expectedContentTypeSuffix] of [
        ["\r\n", null],
        ["\\", "\\"],
        ["/", "/"],
        ["5", "5"]
    ]) {
        it(`put and get special char ${JSON.stringify(nameAndContentType)}`, async () => {
            const name = "aA" + nameAndContentType;
            const expectedContentType = expectedContentTypeSuffix !== null ? "aA" + expectedContentTypeSuffix : null;

            await storeUser("users/1", "Fitzchak");

            const result = await store.operations.send(
                new PutAttachmentOperation("users/1", name, Buffer.from([1, 2, 3]), name));
            assertThat(result.changeVector.startsWith("A:2")).isTrue();
            assertThat(result.name).isEqualTo(name);
            assertThat(result.documentId).isEqualTo("users/1");
            assertThat(result.contentType).isEqualTo(name);
            assertThat(result.size).isEqualTo(3);

            const { flags, attachments } = await loadUserAttachments();
            assertThat(flags).isEqualTo("HasAttachments");
            assertThat(attachments).hasSize(1);
            assertThat(attachments[0].name).isEqualTo(name);

            const { details, bytes } = await getAttachment("users/1", name);
            assertThat(details.name).isEqualTo(name);
            assert.deepStrictEqual([...bytes], [1, 2, 3]);
            assert.strictEqual(details.contentType, expectedContentType);
            assertThat(details.size).isEqualTo(3);
        });
    }

    it("delete attachments", async () => {
        await storeUser("users/1", "Fitzchak");

        for (let i = 1; i <= 3; i++) {
            await store.operations.send(new PutAttachmentOperation("users/1", "file" + i, bytesFrom1(3 * i), "image/png"));
        }
        await assertAttachmentCount(3);

        await store.operations.send(new DeleteAttachmentOperation("users/1", "file2"));
        await assertAttachmentCount(2);

        const { flags, attachments } = await loadUserAttachments();
        assertThat(flags).isEqualTo("HasAttachments");
        assertThat(attachments).hasSize(2);
        assertThat(attachments[0].name).isEqualTo("file1");
        assertThat(attachments[0].hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
        assertThat(attachments[1].name).isEqualTo("file3");
        assertThat(attachments[1].hash).isEqualTo("NRQuixiqj+xvEokF6MdQq1u+uH1dk/gk2PLChJQ58Vo=");

        {
            const { details, bytes } = await getAttachment("users/1", "file1");
            assertThat(details.changeVector).contains("A:2");
            assertThat(details.name).isEqualTo("file1");
            assertThat(details.hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
            assert.deepStrictEqual([...bytes], [1, 2, 3]);
        }
        {
            const { details, bytes } = await getAttachment("users/1", "file3");
            assertThat(details.changeVector).contains("A:6");
            assertThat(details.name).isEqualTo("file3");
            assertThat(details.hash).isEqualTo("NRQuixiqj+xvEokF6MdQq1u+uH1dk/gk2PLChJQ58Vo=");
            assert.deepStrictEqual([...bytes], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        }

        await store.getRequestExecutor().execute(new DeleteDocumentCommand("users/1"));
        await assertAttachmentCount(0, undefined, 0);
    });

    it("put and delete attachments with the same stream also test big streams", async () => {
        for (let i = 1; i <= 3; i++) {
            await storeUser("users/" + i, "Fitzchak " + i);

            await store.operations.send(
                new PutAttachmentOperation("users/" + i, "file" + i, bytesFrom1(128 * 1024), "image/png"));
        }
        await store.operations.send(
            new PutAttachmentOperation("users/1", "big-file", bytesFrom1(999 * 1024), "image/png"));
        await assertAttachmentCount(2, 4, 3);

        {
            const { details, bytes } = await getAttachment("users/3", "file3");
            assertThat(details.changeVector.startsWith("A:8")).isTrue();
            assertThat(details.name).isEqualTo("file3");
            assertThat(details.hash).isEqualTo("uuBtr5rVX6NAXzdW2DhuG04MGGyUzFzpS7TelHw3fJQ=");
            assertThat(bytes.length).isEqualTo(128 * 1024);
            assertThat(details.size).isEqualTo(128 * 1024);
            assert.deepStrictEqual(bytes, bytesFrom1(128 * 1024));
        }

        const result = await store.operations.send(
            new GetAttachmentOperation("users/1", "file3", "Document", "B:50-nonexistent"));
        assert.strictEqual(result, null);

        {
            const { details, bytes } = await getAttachment("users/1", "big-file");
            assertThat(details.changeVector.startsWith("A:10")).isTrue();
            assertThat(details.name).isEqualTo("big-file");
            assertThat(details.hash).isEqualTo("zKHiLyLNRBZti9DYbzuqZ/EDWAFMgOXB+SwKvjPAINk=");
            assertThat(bytes.length).isEqualTo(999 * 1024);
            assertThat(details.size).isEqualTo(999 * 1024);
            assert.deepStrictEqual(bytes, bytesFrom1(999 * 1024));
        }

        await store.operations.send(new DeleteAttachmentOperation("users/1", "file1"));
        await assertAttachmentCount(2, 3, 3);

        await store.operations.send(new DeleteAttachmentOperation("users/2", "file2"));
        await assertAttachmentCount(2, 2, 3);

        await store.operations.send(new DeleteAttachmentOperation("users/3", "file3"));
        await assertAttachmentCount(1, 1, 3);

        await store.operations.send(new DeleteAttachmentOperation("users/1", "big-file"));
        await assertAttachmentCount(0, 0, 3);

        for (let i = 1; i <= 3; i++) {
            const session = store.openSession();
            const user = await session.load("users/" + i, User);
            const metadata = session.advanced.getMetadataFor(user);
            assertThat(CONSTANTS.Documents.Metadata.FLAGS in metadata).isFalse();
            assertThat(CONSTANTS.Documents.Metadata.ATTACHMENTS in metadata).isFalse();
        }
    });

    it("delete document with attachments that have the same stream", async () => {
        for (let i = 1; i <= 3; i++) {
            await storeUser("users/" + i, "Fitzchak " + i);

            await store.operations.send(new PutAttachmentOperation("users/" + i, "file" + i, bytesFrom1(3), "image/png"));
        }
        await store.operations.send(new PutAttachmentOperation("users/1", "second-file", bytesFrom1(17), "image/png"));
        await assertAttachmentCount(2, 4, 3);

        await store.getRequestExecutor().execute(new DeleteDocumentCommand("users/2"));
        await assertAttachmentCount(2, 3, 2);

        await store.getRequestExecutor().execute(new DeleteDocumentCommand("users/1"));
        await assertAttachmentCount(1, 1, 1);

        await store.getRequestExecutor().execute(new DeleteDocumentCommand("users/3"));
        await assertAttachmentCount(0, 0, 0);
    });

    it("can patch without conflicts on attachments", async () => {
        await storeUser("users/1", "Fitzchak");

        await store.operations.send(new PutAttachmentOperation("users/1", "profile", Buffer.from([1, 2, 3]), "image/png"));

        const patch = new PatchRequest();
        patch.script = "this.lastName = args.newUser.lastName;";
        patch.values = { newUser: { lastName: "Yitzchaki" } };
        await store.operations.send(new PatchOperation("users/1", null, patch));

        const session = store.openSession();
        const user = await session.load("users/1", User);
        assertThat(user.lastName).isEqualTo("Yitzchaki");

        const metadata = session.advanced.getMetadataFor(user);
        assertThat(metadata[CONSTANTS.Documents.Metadata.FLAGS]).isEqualTo("HasAttachments");
        const attachments = metadata[CONSTANTS.Documents.Metadata.ATTACHMENTS] as AttachmentName[];
        assertThat(attachments).hasSize(1);
        assertThat(attachments[0].name).isEqualTo("profile");
        assertThat(attachments[0].hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
    });

    it("put attachment and modify document", async () => {
        await storeUser("users/1", "Fitzchak");

        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", Buffer.from([1, 2, 3]), "image/png"));

        const session = store.openSession();
        const user = await session.load("users/1", User);
        user.lastName = "Yitzchaki";
        await session.saveChanges();
    });

    it("put attachment than evict and modify document in the same session", async () => {
        const session = store.openSession();
        let user = Object.assign(new User(), { name: "Fitzchak" });
        await session.store(user, "users/1");
        await session.saveChanges();

        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", Buffer.from([1, 2, 3]), "image/png"));

        session.advanced.evict(user);
        user = await session.load("users/1", User);
        user.lastName = "Yitzchaki";
        await session.saveChanges();
    });

    it("put attachment and modify document in the same session", async () => {
        const session = store.openSession();
        let user = Object.assign(new User(), { name: "Fitzchak" });
        await session.store(user, "users/1");
        await session.saveChanges();

        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", Buffer.from([1, 2, 3]), "image/png"));

        user = await session.load("users/1", User);
        user.lastName = "Yitzchaki";
        await session.saveChanges();
    });

    it("put attachment and modify document in the same session without another load", async () => {
        const session = store.openSession();
        const user = Object.assign(new User(), { name: "Fitzchak" });
        await session.store(user, "users/1");
        await session.saveChanges();

        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", Buffer.from([1, 2, 3]), "image/png"));

        user.lastName = "Yitzchaki";
        await session.saveChanges();
    });

    it("overwrite attachment with stream only", async () => {
        await storeUser("users/1", "Fitzchak");

        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", Buffer.from([1, 2, 3]), "image/png"));
        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", Buffer.from([1, 2, 3, 4, 5]), "image/png"));

        const { flags, attachments } = await loadUserAttachments();
        assertThat(flags).isEqualTo("HasAttachments");
        assertThat(attachments).hasSize(1);
        assertThat(attachments[0].name).isEqualTo("Profile");
        assertThat(attachments[0].hash).isEqualTo("Arg5SgIJzdjSTeY6LYtQHlyNiTPmvBLHbr/Cypggeco=");
        assertThat(attachments[0].size).isEqualTo(5);
        assertThat(attachments[0].contentType).isEqualTo("image/png");

        await assertAttachmentCount(1);
    });

    it("put same attachment twice different content type", async () => {
        await storeUser("users/1", "Fitzchak");

        const profileStream = Buffer.from([1, 2, 3]);
        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", profileStream, "image/png"));
        await store.operations.send(new PutAttachmentOperation("users/1", "Profile", profileStream, "image/jpeg"));

        const { flags, attachments } = await loadUserAttachments();
        assertThat(flags).isEqualTo("HasAttachments");
        assertThat(attachments).hasSize(1);
        assertThat(attachments[0].name).isEqualTo("Profile");
        assertThat(attachments[0].hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
        assertThat(attachments[0].size).isEqualTo(3);
        assertThat(attachments[0].contentType).isEqualTo("image/jpeg");

        await assertAttachmentCount(1);
    });

    it("put same attachment twice also make sure that the stream is not disposed after calling put attachment", async () => {
        await storeUser("users/1", "Fitzchak");

        const profileStream = Buffer.from([1, 2, 3]);

        let result = await store.operations.send(
            new PutAttachmentOperation("users/1", "Profile", profileStream, "IMAGE/png"));
        assertThat(result.changeVector.startsWith("A:2")).isTrue();
        assertThat(result.name).isEqualTo("Profile");
        assertThat(result.documentId).isEqualTo("users/1");
        assertThat(result.contentType).isEqualTo("IMAGE/png");
        assertThat(result.hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
        assertThat(result.size).isEqualTo(3);

        result = await store.operations.send(
            new PutAttachmentOperation("users/1", "PROFILE", profileStream, "image/PNG"));
        assertThat(result.changeVector.startsWith("A:4")).isTrue();
        assertThat(result.name).isEqualTo("PROFILE");
        assertThat(result.documentId).isEqualTo("users/1");
        assertThat(result.contentType).isEqualTo("image/PNG");
        assertThat(result.hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
        assertThat(result.size).isEqualTo(3);

        const { flags, attachments } = await loadUserAttachments();
        assertThat(flags).isEqualTo("HasAttachments");
        assertThat(attachments).hasSize(1);
        assertThat(attachments[0].name).isEqualTo("PROFILE");
        assertThat(attachments[0].contentType).isEqualTo("image/PNG");
        assertThat(attachments[0].hash).isEqualTo("EcDnm3HDl2zNDALRMQ4lFsCO3J2Lb1fM1oDWOk2Octo=");
        assertThat(attachments[0].size).isEqualTo(3);

        await assertAttachmentCount(1);
    });

    it("throw not readable stream", async () => {
        await storeUser("users/1", "Fitzchak");

        const profileStream = Readable.from([Buffer.from([1, 2, 3])]);
        profileStream.destroy();

        await assertThrows(
            () => store.operations.send(new PutAttachmentOperation("users/1", "Profile", profileStream, "image/png")),
            err => {
                assertThat(err.name).isEqualTo("InvalidOperationException");
                assertThat(err.message).isEqualTo(
                    "Cannot put an attachment with a not readable stream. "
                    + "Make sure that the specified stream is readable and was not disposed.");
            });
    });
});
