import assert from "node:assert";
import { Readable } from "node:stream";
import { GetAttachmentOperation, IDocumentStore, PutAttachmentOperation } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { User } from "../Assets/Entities.js";
import { assertThat } from "../Utils/AssertExtensions.js";

describe("[RDBC-1213] PutAttachmentOperation with a Readable body", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "Fitzchak" }), "users/1");
        await session.saveChanges();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function getAttachmentBytes(name: string): Promise<Buffer> {
        const attachment = await store.operations.send(
            new GetAttachmentOperation("users/1", name, "Document", null));
        try {
            return Buffer.concat(await attachment.data.toArray());
        } finally {
            attachment.dispose();
        }
    }

    it("stores the bytes of a single chunk stream", async () => {
        const details = await store.operations.send(
            new PutAttachmentOperation("users/1", "profile", Readable.from([Buffer.from([1, 2, 3])]), "image/png"));

        assertThat(details.size).isEqualTo(3);
        assert.deepStrictEqual([...await getAttachmentBytes("profile")], [1, 2, 3]);
    });

    it("stores the bytes of a multi chunk stream", async () => {
        const chunks = [Buffer.alloc(64 * 1024, 1), Buffer.alloc(64 * 1024, 2), Buffer.from([3])];

        const details = await store.operations.send(
            new PutAttachmentOperation("users/1", "big", Readable.from(chunks)));

        const expected = Buffer.concat(chunks);
        assertThat(details.size).isEqualTo(expected.length);
        assert.deepStrictEqual(await getAttachmentBytes("big"), expected);
    });
});
