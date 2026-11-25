import assert from "node:assert";
import { Readable } from "node:stream";
import { IDocumentStore, PutAttachmentOperation } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { User } from "../Assets/Entities.js";
import { assertThrows } from "../Utils/AssertExtensions.js";

describe("[RDBC-1212] Attachment put rejects a not readable stream", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function consumedStream(): Promise<Readable> {
        const stream = Readable.from([Buffer.from([1, 2, 3])]);
        await stream.toArray();
        return stream;
    }

    function assertNotReadableStreamError(err: Error) {
        assert.strictEqual(err.name, "InvalidOperationException");
        assert.strictEqual(err.message,
            "Cannot put an attachment with a not readable stream. "
            + "Make sure that the specified stream is readable and was not disposed.");
    }

    it("session store throws for a consumed stream", async () => {
        const session = store.openSession();
        const user = Object.assign(new User(), { name: "Fitzchak" });
        await session.store(user, "users/1");

        const stream = await consumedStream();

        await assertThrows(
            () => session.advanced.attachments.store(user, "profile", stream, "image/png"),
            assertNotReadableStreamError);
    });

    it("put attachment operation throws for a consumed stream", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "Fitzchak" }), "users/1");
        await session.saveChanges();

        const stream = await consumedStream();

        await assertThrows(
            () => store.operations.send(new PutAttachmentOperation("users/1", "profile", stream, "image/png")),
            assertNotReadableStreamError);
    });

    it("ai conversation run throws for a destroyed stream", async () => {
        const conversation = store.ai.conversation("agents/1-A", "conversations/1|");
        const stream = Readable.from([Buffer.from([1, 2, 3])]);
        conversation.addAttachment("file.png", stream, "image/png");
        stream.destroy();

        await assertThrows(() => conversation.run(), assertNotReadableStreamError);
    });
});
