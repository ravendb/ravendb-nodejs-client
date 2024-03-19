import { AbstractJavaScriptIndexCreationTask, IDocumentStore, PutCompareExchangeValueOperation } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { User } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";

describe("[RDBC-825] Load all attachments in js index", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can index content and details for all attachments", async () => {
        const user1 = new User();
        user1.name = "Name1";
        
        const user2 = new User();
        user2.name = "Name2";

        const user3 = new User();
        user3.name = "Name3";

        const user4 = new User();
        user4.name = "Name4";
        {
            const session = store.openSession();

            await session.store(user1);
            await session.store(user2);
            await session.store(user3);
            await session.store(user4);

            let stream = Buffer.from("white yellow pink");
            session.advanced.attachments.store(user1.id, "lightColors.txt", stream, "text/plain");

            stream = Buffer.from("black brown blue");
            session.advanced.attachments.store(user1.id, "darkColors.txt", stream, "text/plain");

            stream = Buffer.from("white yellow pink black brown blue");
            session.advanced.attachments.store(user2.id, "allColors.txt", stream, "text/plain");

            stream = Buffer.from("Poland, Israel, Germany");
            session.advanced.attachments.store(user3.id, "countries1.txt", stream, "text/plain");

            stream = Buffer.from("USA, Canada, Mexico");
            session.advanced.attachments.store(user4.id, "countries2.txt", stream, "text/plain");

            await session.saveChanges();
        }

        await store.executeIndex(new Users_ByAllAttachments());
        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            
            const users = await session.query<User>(User, Users_ByAllAttachments)
                .whereEquals("attachmentName", "countries1.txt")
                .orElse()
                .search("attachmentContent", "white blue")
                .all();
            
            assertThat(users).hasSize(3);
        }
    });
});

class Users_ByAllAttachments extends AbstractJavaScriptIndexCreationTask<User> {

    constructor() {
        super();

        const { loadAttachments } = this.mapUtils();

        this.map("users", user => {
            
            const allAttachments = loadAttachments(user);

            return allAttachments.map(attachment => ({
                attachmentName: attachment.Name,
                attachmentContentType: attachment.ContentType,
                attachmentSize: attachment.Size,
                attachmentContent: attachment.getContentAsString()
            }));
        });

        this.index("attachmentContent", "Search");
    }
}
