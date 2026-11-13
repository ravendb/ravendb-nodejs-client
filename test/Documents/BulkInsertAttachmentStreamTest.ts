import { Readable } from "node:stream";
import { IDocumentStore } from "../../src/index.js";
import { readToBuffer } from "../../src/Utility/StreamUtil.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../Utils/AssertExtensions.js";
import { User } from "../Assets/Entities.js";

describe("BulkInsertAttachmentStreamTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("stores an attachment from a stream that arrives in chunks", async () => {
        const content = Buffer.from("x".repeat(100_000));
        const chunks = Array.from({ length: 10 }, (_, i) => content.subarray(i * 10_000, (i + 1) * 10_000));

        const bulkInsert = store.bulkInsert();
        try {
            await bulkInsert.store(new User(), "users/1");
            await bulkInsert.attachmentsFor("users/1").store("file.txt", Readable.from(chunks), "text/plain");
            await bulkInsert.store(new User(), "users/2");
        } finally {
            await bulkInsert.finish();
        }

        const session = store.openSession();
        const attachment = await session.advanced.attachments.get("users/1", "file.txt");
        try {
            assertThat(attachment.details.contentType).isEqualTo("text/plain");
            assertThat(attachment.details.size).isEqualTo(content.length);
            attachment.data.resume();
            assertThat((await readToBuffer(attachment.data)).equals(content)).isTrue();
        } finally {
            attachment.dispose();
        }

        assertThat(await session.load("users/2", User)).isNotNull();
    });

    it("rejects missing attachment data", async () => {
        const bulkInsert = store.bulkInsert();
        try {
            await bulkInsert.store(new User(), "users/1");
            await assertThrows(
                () => bulkInsert.attachmentsFor("users/1").store("file.txt", null),
                err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
        } finally {
            await bulkInsert.finish();
        }
    });
});
