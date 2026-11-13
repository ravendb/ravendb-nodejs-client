import assert from "node:assert";
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../../Utils/TestUtil.js";
import { AttachmentRequest, DeleteAttachmentsOperation, IDocumentStore } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("DeleteAttachmentsOperationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUserWithAttachments(id: string, names: string[]) {
        const session = store.openSession();
        const user = new User();
        user.name = id;
        await session.store(user, id);

        for (const name of names) {
            session.advanced.attachments.store(id, name, Buffer.from(name), "text/plain");
        }

        await session.saveChanges();
    }

    async function getAttachmentNames(id: string): Promise<string[]> {
        const session = store.openSession();
        const user = await session.load<User>(id);
        return session.advanced.attachments.getNames(user).map(x => x.name).sort();
    }

    it("deletes attachments of several documents in a single request", async () => {
        await storeUserWithAttachments("users/1", ["a", "b", "c"]);
        await storeUserWithAttachments("users/2", ["d", "e"]);

        await store.operations.send(new DeleteAttachmentsOperation([
            new AttachmentRequest("users/1", "a"),
            new AttachmentRequest("users/1", "c"),
            new AttachmentRequest("users/2", "d")
        ]));

        assert.deepStrictEqual(await getAttachmentNames("users/1"), ["b"]);
        assert.deepStrictEqual(await getAttachmentNames("users/2"), ["e"]);
    });

    it("keeps the id and name exactly as given", async () => {
        const id = "Users/With Space/1";
        const name = "Sprawozdanie żółć #1.txt";
        await storeUserWithAttachments(id, [name, "other"]);

        await store.operations.send(new DeleteAttachmentsOperation([new AttachmentRequest(id, name)]));

        assert.deepStrictEqual(await getAttachmentNames(id), ["other"]);
    });

    it("ignores an attachment that does not exist", async () => {
        await storeUserWithAttachments("users/1", ["a"]);

        await store.operations.send(new DeleteAttachmentsOperation([
            new AttachmentRequest("users/1", "missing"),
            new AttachmentRequest("users/1", "a")
        ]));

        assert.deepStrictEqual(await getAttachmentNames("users/1"), []);
    });

    it("rejects an empty list before sending the request", () => {
        assert.throws(() => new DeleteAttachmentsOperation([]), { name: "InvalidArgumentException" });
        assert.throws(() => new DeleteAttachmentsOperation(null), { name: "InvalidArgumentException" });
    });
});
