import { IDocumentStore, SubscriptionCreationOptions, SubscriptionWorkerOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_17624Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("forbidOpeningMoreThenOneSessionPerSubscriptionBatch", async () => {
        {
            const session = store.openSession();
            const command1 = new Command();
            command1.value = 1;
            await session.store(command1);

            const command2 = new Command();
            command2.value = 2;
            await session.store(command2);

            await session.saveChanges();
        }

        await assertThrows(() => store.subscriptions.getSubscriptionState("BackgroundSubscriptionWorker"), err => {
            assertThat(err.name)
                .isEqualTo("SubscriptionDoesNotExistException");
        });

        const subscriptionCreationOptions: SubscriptionCreationOptions = {
            name: "BackgroundSubscriptionWorker"
        };

        await store.subscriptions.create({
            documentType: Command,
            ...subscriptionCreationOptions
        });

        const workerOptions: SubscriptionWorkerOptions<Command> = {
            subscriptionName: "BackgroundSubscriptionWorker",
            documentType: Command
        };

        {
            const worker = store.subscriptions.getSubscriptionWorker(workerOptions);
            await new Promise<void>((resolve, reject) => {
                worker.on("batch", async (batch, callback) => {
                    {
                        const session = batch.openSession();
                    }
                    try {
                        await assertThrows(() => batch.openSession(), err => {
                            assertThat(err.name)
                                .isEqualTo("IllegalStateException")
                                .contains("Session can only be opened once per each Subscription batch");
                        });
                        callback();
                        resolve();
                    } catch (e) {
                        reject(e);
                    }

                });

                worker.on("error", reject);
                worker.on("connectionRetry", reject);
            });
        }
    });
})


class Command {
    id: string;
    processedOn: Date;
    value: number;
}
