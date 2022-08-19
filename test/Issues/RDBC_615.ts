import { AbstractJavaScriptIndexCreationTask, IDocumentStore, PutCompareExchangeValueOperation } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { Address, User } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";

type IndexEntry = {
    name: string;
    city: string;
}

describe("[RDBC-615] Expose ability to load attachments/cmp exchange in js indexes", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can index compare exchange", async () => {
        const user = new User();
        user.addressId = "address/1";
        user.name = "Marcin";

        {
            const session = store.openSession();

            const address = new Address();
            address.city = "Warsaw";
            await store.operations.send(new PutCompareExchangeValueOperation("address/1", address, 0));

            await session.store(user);
            await session.saveChanges();
        }

        await store.executeIndex(new Users_ByAddress());

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const user1 = await session.query<User>(User, Users_ByAddress)
                .whereEquals("name", "Marcin")
                .whereEquals("city", "Warsaw")
                .firstOrNull();
            assertThat(user1)
                .isNotNull();
        }
    });

    it("can index attachment names", async () => {
        const user = new User();
        user.addressId = "address/1";
        user.name = "Marcin";

        {
            const session = store.openSession();

            await session.store(user);

            const stream = Buffer.from([5, 4, 3, 2, 1]);
            session.advanced.attachments.store(user.id, "photo.jpg", stream);

            await session.saveChanges();
        }

        await store.executeIndex(new Users_Attachments());

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const user1 = await session.query<User>(User, Users_Attachments)
                .whereEquals("name", "Marcin")
                .whereEquals("attachmentName", "photo.jpg")
                .firstOrNull();
            assertThat(user1)
                .isNotNull();
        }
    });

    it("can index attachment content", async () => {
        const user = new User();
        user.addressId = "address/1";
        user.name = "Marcin";

        {
            const session = store.openSession();

            await session.store(user);

            const stream = Buffer.from("pizza");
            session.advanced.attachments.store(user.id, "text.txt", stream);

            await session.saveChanges();
        }

        await store.executeIndex(new Users_LoadedAttachment());

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const user1 = await session.query<User>(User, Users_LoadedAttachment)
                .whereEquals("name", "Marcin")
                .whereEquals("text", "pizza")
                .firstOrNull();
            assertThat(user1)
                .isNotNull();
        }
    });
});


class Users_ByAddress extends AbstractJavaScriptIndexCreationTask<User, IndexEntry> {

    constructor() {
        super();

        const { cmpxchg } = this.mapUtils();

        this.map("Users", user => {
            const address = cmpxchg<Address>(user.addressId);
            return {
                city: address.city,
                name: user.name
            }
        });
    }
}

class Users_Attachments extends AbstractJavaScriptIndexCreationTask<User> {
    constructor() {
        super();

        const { attachmentsFor } = this.mapUtils();

        this.map("Users", user => {
            const attachments = attachmentsFor(user);

            return attachments.map(a => {
                return {
                    name: user.name,
                    attachmentName: a.Name
                }
            });
        });
    }
}

class Users_LoadedAttachment extends AbstractJavaScriptIndexCreationTask<User> {

    constructor() {
        super();

        const { loadAttachment } = this.mapUtils();

        this.map("Users", user => {
            const attachment = loadAttachment(user, "text.txt");

            return {
                name: user.name,
                text: attachment.getContentAsString()
            }
        })
    }
}
