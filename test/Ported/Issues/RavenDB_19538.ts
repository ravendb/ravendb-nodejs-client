import { IDocumentStore, SubscriptionWorkerOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_19538Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canModifyMetadataInSubscriptionBatch", async () => {
        const sub = await store.subscriptions.create(User);

        const workerOptions: SubscriptionWorkerOptions<User> = {
            subscriptionName: sub,
            timeToWaitBeforeConnectionRetry: 5_000,
            maxDocsPerBatch: 2,
            documentType: User
        };

        const subscription = store.subscriptions.getSubscriptionWorker(workerOptions);
        {
            const session = store.openSession();
            for (let i = 0; i < 2; i++) {
                const user = new User();
                user.count = 1;
                user.id = "Users/" + i;
                await session.store(user);
            }

            await session.saveChanges();
        }

        try {
            const date1 = testContext.utcToday().clone().add(1, "hour").toString();
            const date2 = testContext.utcToday().clone().add(2, "hour").toString();

            await new Promise<void>((resolve, reject) => {
                let count = 0;

                subscription.on("batch", async (batch, callback) => {
                    try {
                        const session = batch.openSession();
                        for (const item of batch.items) {
                            const meta = session.advanced.getMetadataFor(item.result);
                            meta.Test1 = date1;
                            item.metadata["Test2"] = date2;
                            count++;
                        }

                        await session.saveChanges();
                        if (count === 2) {
                            resolve();
                        }
                        callback();
                    } catch (e) {
                        reject(e);
                    }
                });
                subscription.on("connectionRetry", reject);
                subscription.on("error", reject);
            });

            for (let i = 0; i < 2; i++) {
                const session = store.openSession();
                const u = await session.load("Users/" + i, User);
                const meta = session.advanced.getMetadataFor(u);
                const metaDate1 = meta["Test1"];
                const metaDate2 = meta["Test2"];
                assertThat(metaDate1)
                    .isEqualTo(date1);
                assertThat(metaDate2)
                    .isEqualTo(date2);
            }
        } finally {
            subscription.dispose();
        }
    })
});
