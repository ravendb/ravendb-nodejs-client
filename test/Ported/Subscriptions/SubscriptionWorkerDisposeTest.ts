import { IDocumentStore, SubscriptionWorker } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("SubscriptionWorkerDisposeTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(new User(), "users/1");
        await session.saveChanges();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function runningWorker(): Promise<SubscriptionWorker<User>> {
        const name = await store.subscriptions.create(User);
        const worker = store.subscriptions.getSubscriptionWorker<User>({ subscriptionName: name, documentType: User });

        await new Promise<void>(resolve => worker.on("batch", (_, callback) => {
            callback();
            resolve();
        }));

        return worker;
    }

    it("disposeAsync resolves after the worker ended", async () => {
        const worker = await runningWorker();
        let ended = false;
        worker.on("end", () => ended = true);

        await worker.disposeAsync();

        assertThat(ended).isTrue();
    });

    it("disposeAsync(false) does not wait for the worker to end", async () => {
        const worker = await runningWorker();
        const end = new Promise<void>(resolve => worker.on("end", () => resolve()));
        let ended = false;
        void end.then(() => ended = true);

        await worker.disposeAsync(false);

        assertThat(ended).isFalse();
        await end;
    });

    it("disposeAsync of a worker that never ran emits end", async () => {
        const name = await store.subscriptions.create(User);
        const worker = store.subscriptions.getSubscriptionWorker<User>(name);
        let ended = false;
        worker.on("end", () => ended = true);

        await worker.disposeAsync();

        assertThat(ended).isTrue();
    });

    it("disposing twice is a no-op", async () => {
        const worker = await runningWorker();
        let endCount = 0;
        worker.on("end", () => endCount++);

        await worker.disposeAsync();
        await worker.disposeAsync();
        worker.dispose();

        assertThat(endCount).isEqualTo(1);
    });
});
