import assert from "node:assert"
import { randomBytes } from "node:crypto";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";
import {
    AttachmentEnumeratorResult,
    AttachmentRequest,
    GetAttachmentsOperation,
    IDocumentStore,
    PutAttachmentOperation
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { readToBuffer } from "../../../src/Utility/StreamUtil.js";

describe("AttachmentsStreamTest", function () {

    const id = "users/1";
    const attachmentName = "Typical attachment name";
    const countsAndSizes = [[10, 3], [10, 1024], [1, 32 * 1024], [10, 32 * 1024], [100, 3], [3, 0]];

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeAttachments(count: number, sizeOf: (i: number) => number): Promise<Map<string, Buffer>> {
        const attachments = new Map<string, Buffer>();
        const session = store.openSession();
        const user = new User();
        user.name = "su";
        await session.store(user, id);

        for (let i = 0; i < count; i++) {
            const data = randomBytes(sizeOf(i));
            session.advanced.attachments.store(id, `${attachmentName}_${i}`, data, "application/zip");
            attachments.set(`${attachmentName}_${i}`, data);
        }

        await session.saveChanges();
        return attachments;
    }

    async function getAllAttachments(): Promise<AsyncGenerator<AttachmentEnumeratorResult>> {
        const session = store.openSession();
        const user = await session.load<User>(id);
        const requests = session.advanced.attachments.getNames(user)
            .map(x => new AttachmentRequest(id, x.name));
        return session.advanced.attachments.get(requests);
    }

    async function readBytes(result: AttachmentEnumeratorResult, length: number): Promise<Buffer> {
        const chunks: Buffer[] = [];
        let read = 0;
        for await (const chunk of result.data) {
            chunks.push(chunk);
            read += chunk.length;
            if (read >= length) {
                break;
            }
        }

        return Buffer.concat(chunks).subarray(0, length);
    }

    function factorial(n: number): number {
        return n <= 1 ? 1 : n * factorial(n - 1);
    }

    for (const size of [1024, 32 * 1024, 256 * 1024, 1024 * 1024]) {
        it(`can get one attachment (size: ${size})`, async () => {
            const data = randomBytes(size);
            {
                const session = store.openSession();
                const user = new User();
                user.name = "su";
                await session.store(user, id);
                await session.saveChanges();
            }

            await store.operations.send(new PutAttachmentOperation(id, attachmentName, data, "application/zip"));

            const results: AttachmentEnumeratorResult[] = [];
            for await (const result of await getAllAttachments()) {
                assert.ok((await readToBuffer(result.data)).equals(data));
                results.push(result);
            }

            assert.strictEqual(results.length, 1);
            const { details } = results[0];
            assert.strictEqual(details.name, attachmentName);
            assert.strictEqual(details.documentId, id);
            assert.strictEqual(details.contentType, "application/zip");
            assert.strictEqual(details.size, size);
            assert.ok(details.hash);
            assert.ok(details.changeVector);
        });
    }

    for (const count of [1, 10, 100]) {
        it(`can consume stream (count: ${count})`, async () => {
            const attachments = await storeAttachments(count, () => 32 * 1024);

            let read = 0;
            for await (const result of await getAllAttachments()) {
                assert.ok((await readToBuffer(result.data)).equals(attachments.get(result.details.name)));
                assert.strictEqual((await readToBuffer(result.data)).length, 0);
                read++;
            }

            assert.strictEqual(read, count);
        });
    }

    for (const [count, size] of countsAndSizes) {
        it(`can get list of attachments and skip (count: ${count}, size: ${size})`, async () => {
            const attachments = await storeAttachments(count, () => size);

            let index = 0;
            for await (const result of await getAllAttachments()) {
                if (index++ % 2 === 0) {
                    continue;
                }

                assert.ok((await readToBuffer(result.data)).equals(attachments.get(result.details.name)));
            }

            assert.strictEqual(index, count);
        });

        it(`can get list of attachments and read ordered (count: ${count}, size: ${size})`, async () => {
            const attachments = await storeAttachments(count, () => size);

            const names: string[] = [];
            for await (const result of await getAllAttachments()) {
                assert.ok((await readToBuffer(result.data)).equals(attachments.get(result.details.name)));
                names.push(result.details.name);
            }

            const session = store.openSession();
            const user = await session.load<User>(id);
            assert.deepStrictEqual(names, session.advanced.attachments.getNames(user).map(x => x.name));
        });

        it(`should throw on disposed stream (count: ${count}, size: ${size})`, async () => {
            await storeAttachments(count, () => size);

            let last: AttachmentEnumeratorResult;
            for await (const result of await getAllAttachments()) {
                last = result;
            }

            assert.ok(last.data.destroyed);
            await assert.rejects(readToBuffer(last.data));
        });

        it(`should throw on accessing disposed attachment (count: ${count}, size: ${size})`, async () => {
            const attachments = await storeAttachments(count, () => size);
            const iterator = await getAllAttachments();

            const first = (await iterator.next()).value as AttachmentEnumeratorResult;
            let next = await iterator.next();
            assert.ok(first.data.destroyed);
            await assert.rejects(readToBuffer(first.data));

            for (let index = 0; !next.done; index++, next = await iterator.next()) {
                const { data, details } = next.value;
                if (index % 2 === 0) {
                    data.destroy();
                    await assert.rejects(readToBuffer(data));
                } else {
                    assert.ok((await readToBuffer(data)).equals(attachments.get(details.name)));
                }
            }
        });

        it(`can get list of attachments and read partially (count: ${count}, size: ${size})`, async () => {
            const attachments = await storeAttachments(count, () => size);

            let index = 0;
            for await (const result of await getAllAttachments()) {
                const expected = attachments.get(result.details.name);
                if (index++ % 2 === 0) {
                    const partSize = Math.floor(size / 3);
                    assert.ok((await readBytes(result, partSize)).equals(expected.subarray(0, partSize)));
                } else {
                    assert.ok((await readToBuffer(result.data)).equals(expected));
                }
            }

            assert.strictEqual(index, count);
        });
    }

    for (const count of [1, 10]) {
        it(`can get list of different attachments and read (count: ${count})`, async () => {
            const attachments = await storeAttachments(count, factorial);

            let read = 0;
            for await (const result of await getAllAttachments()) {
                const expected = attachments.get(result.details.name);
                assert.strictEqual(result.details.size, expected.length);
                assert.ok((await readToBuffer(result.data)).equals(expected));
                read++;
            }

            assert.strictEqual(read, count);
        });
    }

    it("can send non existing list of attachments", async () => {
        const data = randomBytes(1024);
        {
            const session = store.openSession();
            const user = new User();
            user.name = "su";
            await session.store(user, id);
            session.advanced.attachments.store(id, attachmentName, data, "application/zip");
            await session.saveChanges();
        }

        const readAll = async (requests: AttachmentRequest[]) => {
            const results: { name: string, data: Buffer }[] = [];
            const session = store.openSession();
            for await (const result of await session.advanced.attachments.get(requests)) {
                results.push({ name: result.details.name, data: await readToBuffer(result.data) });
            }

            return results;
        };

        assert.deepStrictEqual(await readAll([]), []);
        assert.deepStrictEqual(await readAll([new AttachmentRequest("users/1", "1")]), []);
        assert.deepStrictEqual(await readAll([new AttachmentRequest("users/2", "1")]), []);
        assert.deepStrictEqual(await readAll([
            new AttachmentRequest("users/1", "1"),
            new AttachmentRequest("users/1", attachmentName),
            new AttachmentRequest("users/2", "1")
        ]), [{ name: attachmentName, data }]);
    });

    it("can get attachments with JSON special characters in names", async () => {
        const attachments = new Map([
            ["quote\"brace}{bracket][back\\slash.bin", randomBytes(100)],
            ["fileNAME_#$1^%_בעברית.txt", randomBytes(200)],
            ["}", randomBytes(1)]
        ]);
        {
            const session = store.openSession();
            await session.store(new User(), id);
            for (const [name, data] of attachments) {
                session.advanced.attachments.store(id, name, data);
            }
            await session.saveChanges();
        }

        const requests = [...attachments.keys()].map(name => new AttachmentRequest(id, name));
        const results = await store.operations.send(new GetAttachmentsOperation(requests, "Document"));

        const names: string[] = [];
        for await (const result of results) {
            assert.ok((await readToBuffer(result.data)).equals(attachments.get(result.details.name)));
            names.push(result.details.name);
        }

        assert.deepStrictEqual(names, [...attachments.keys()]);
    });

    it("can stop iterating before reading all attachments", async () => {
        const attachments = await storeAttachments(10, () => 32 * 1024);

        for await (const result of await getAllAttachments()) {
            assert.ok((await readToBuffer(result.data)).equals(attachments.get(result.details.name)));
            break;
        }

        let read = 0;
        for await (const result of await getAllAttachments()) {
            assert.ok((await readToBuffer(result.data)).equals(attachments.get(result.details.name)));
            read++;
        }

        assert.strictEqual(read, 10);
    });
});
