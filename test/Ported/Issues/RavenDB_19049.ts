import * as assert from "node:assert";
import { Readable } from "node:stream";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { IDocumentStore } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_19049", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const id = "users/1";
    const name = "file.txt";

    async function setup() {
        const session = store.openSession();
        const user = Object.assign(new User(), { name: "Fitzchak" });
        await session.store(user, id);

        session.advanced.attachments.store(user, name, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]));

        await session.saveChanges();
    }

    async function readAll(stream: Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    it("returnsRange", async () => {
        await setup();

        const session = store.openSession();
        const attachment = await session.advanced.attachments.getRange(id, name, 3, 5);
        try {
            const bytes = await readAll(attachment.data);

            assert.strictEqual(attachment.details.size, 9);
            assert.deepStrictEqual([...bytes], [4, 5, 6]);
        } finally {
            attachment.dispose();
        }
    });

    it("returnsOpenEndedRangeForEntity", async () => {
        await setup();

        const session = store.openSession();
        const user = await session.load(id, User);
        const attachment = await session.advanced.attachments.getRange(user, name, 6, null);
        try {
            const bytes = await readAll(attachment.data);
            assert.deepStrictEqual([...bytes], [7, 8, 9]);
        } finally {
            attachment.dispose();
        }
    });

    it("throwsForUnsupportedRange", async () => {
        await setup();

        const session = store.openSession();

        await assert.rejects(() => session.advanced.attachments.getRange(id, name, 999, 1000),
            { name: "InvalidAttachmentRangeException" });

        await assert.rejects(() => session.advanced.attachments.getRange(id, name, -5, 5),
            { name: "ArgumentOutOfRangeException" });

        await assert.rejects(() => session.advanced.attachments.getRange(id, name, 10, 5),
            { name: "ArgumentOutOfRangeException" });
    });
});
