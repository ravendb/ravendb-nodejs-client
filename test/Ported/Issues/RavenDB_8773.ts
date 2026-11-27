import { IDocumentStore } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_8773", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can deal with documents and attachments having hash character", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "#" }), "#");
            await session.saveChanges();

            const user = await session.load("#", User);
            assertThat(user)
                .isNotNull();

            const users = await session.query(User)
                .waitForNonStaleResults()
                .whereEquals("name", "#")
                .all();

            assertThat(users[0].id)
                .isEqualTo("#");
        }

        {
            const session = store.openSession();
            session.advanced.attachments.store("#", "#", Buffer.from([1]));
            await session.saveChanges();

            const attachmentResult = await session.advanced.attachments.get("#", "#");
            try {
                assertThat(attachmentResult.details.size)
                    .isEqualTo(1);
            } finally {
                attachmentResult.dispose();
            }
        }

        {
            const session = store.openSession();
            session.advanced.attachments.delete("#", "#");
            await session.saveChanges();

            const attachment = await session.advanced.attachments.get("#", "#");
            assertThat(attachment)
                .isNull();

            await session.delete("#");

            assertThat(await session.load("#", User))
                .isNull();
        }
    });
});
