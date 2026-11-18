import assert from "node:assert";
import { IDocumentStore } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";

describe("SubscriptionsCompressionTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async s => {
            s.conventions.disableTcpCompression = false;
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    async function storeUser(id: string, name: string) {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name }), id);
        await session.saveChanges();
    }

    it("processesBatchesOverACompressedConnection", async () => {
        const subscriptionName = await store.subscriptions.create(User);
        const worker = store.subscriptions.getSubscriptionWorker<User>({ subscriptionName, documentType: User });

        try {
            const names: string[] = [];
            let batchProcessed: () => void;
            const nextBatch = () => new Promise<void>(resolve => batchProcessed = resolve);

            worker.on("batch", (batch, callback) => {
                names.push(...batch.items.map(x => x.result.name));
                callback();
                batchProcessed();
            });

            const firstBatch = nextBatch();
            await storeUser("users/1", "John");
            await firstBatch;

            const secondBatch = nextBatch();
            await storeUser("users/2", "Jane");
            await secondBatch;

            assert.deepStrictEqual(names, ["John", "Jane"]);
            assert.strictEqual(worker["_supportedFeatures"].dataCompression, !RavenTestContext.isPullRequest);
        } finally {
            await worker.dispose();
        }
    });
});
