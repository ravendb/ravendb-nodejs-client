import { IDocumentStore, PutAttachmentCommandData } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_14041", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can update attachment using put attachment command data with expected change vector", async () => {
        const documentId = "cats/1-A";
        const name = "bruhhh";
        const contentType = "stuff";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            session.advanced.attachments.store(documentId, name, Buffer.from([1, 2, 3, 4, 5]), contentType);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachment = await session.advanced.attachments.get(documentId, name);
            attachment.dispose();

            const cmd = new PutAttachmentCommandData(
                documentId, name, Buffer.from([6, 7, 8, 9, 10]), contentType, attachment.details.changeVector, null);
            session.advanced.defer(cmd);
            await session.saveChanges();
        }
    });
});
