import {
    DeleteAttachmentOperation,
    GetStatisticsOperation,
    IDocumentStore
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("AttachmentsSessionAsync", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function assertAttachmentCount(uniqueAttachmentCount: number, documentsCount: number) {
        const statistics = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(statistics.countOfDocuments)
            .isEqualTo(documentsCount);
        assertThat(statistics.countOfRevisionDocuments)
            .isEqualTo(0);
        assertThat(statistics.countOfAttachments)
            .isEqualTo(uniqueAttachmentCount);
        assertThat(statistics.countOfUniqueAttachments)
            .isEqualTo(uniqueAttachmentCount);
    }

    it("delete document and than its attachments", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Fitzchak" });
            await session.store(user, "users/1");
            session.advanced.attachments.store(user, "file", Buffer.from([1, 2, 3]), "image/png");
            await session.saveChanges();
        }

        await assertAttachmentCount(1, 1);

        {
            const session = store.openSession();
            const user = await session.load("users/1", User);
            await session.delete(user);
            await session.saveChanges();
        }

        await store.operations.send(new DeleteAttachmentOperation("users/1", "file"));

        await assertAttachmentCount(0, 0);
    });
});
