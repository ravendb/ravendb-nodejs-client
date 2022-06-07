import { IDocumentStore, SubscriptionCreationOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import { User } from "../../Assets/Entities";


describe("RavenDB_16975Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("should_Not_Send_Include_Message", async () => {

        {
            const session = store.openSession();
            const person = new User();
            person.name = "Arava";
            await session.store(person, "users/1");
            await session.saveChanges();
        }

        const creationOptions: SubscriptionCreationOptions = {
            query: "from Users"
        };

        const id = await store.subscriptions.create(creationOptions);

        const sub = store.subscriptions.getSubscriptionWorker<User>(id);
        try {
            await new Promise<void>((resolve, reject) => {
                sub.on("error", reject);
                sub.on("batch", async (batch, callback) => {

                    assertThat(batch.items)
                        .isNotEmpty();

                    {
                        const s = batch.openSession();
                        assertThat(batch.getNumberOfIncludes())
                            .isZero();
                        assertThat(s.advanced.numberOfRequests)
                            .isZero();
                    }

                    resolve();
                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });
});
