import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("RavenDB_25154_Subscriptions", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("subscription_WithTrackAllEntities_ShouldTrackMissingDocuments", async () => {
        const subscriptionName = await store.subscriptions.create({ query: "from Users" });

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Jerry", age: 30 }), "users/1-A");
            await session.saveChanges();
        }

        const worker = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName,
            documentType: User,
            maxDocsPerBatch: 10
        });

        try {
            const saveChangesError = await new Promise<Error>((resolve, reject) => {
                worker.on("error", reject);
                worker.on("batch", async (batch, callback) => {
                    try {
                        const session = batch.openSession({ optimisticConcurrencyMode: "WritesAndReads" });
                        assertThat(await session.load("users/missing-A", User)).isNull();

                        const backgroundSession = store.openSession();
                        await backgroundSession.store(
                            Object.assign(new User(), { name: "Missing User", age: 40 }), "users/missing-A");
                        await backgroundSession.saveChanges();

                        await session.saveChanges();
                        reject(new Error("saveChanges should have thrown"));
                    } catch (err) {
                        resolve(err);
                    } finally {
                        callback();
                    }
                });
            });

            assertThat(saveChangesError.name).isEqualTo("ConcurrencyException");
            assertThat(saveChangesError.message).contains("Document 'users/missing-A' has been modified");
        } finally {
            await worker.dispose();
        }
    });
});
