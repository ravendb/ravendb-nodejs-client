import assert from "node:assert";
import { DocumentConventions, IDocumentStore } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";

describe("SubscriptionsCompressionTest", function () {

    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
        store = null;
    });

    async function storeUser(id: string, name: string) {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name }), id);
        await session.saveChanges();
    }

    async function processTwoBatches() {
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
            return worker["_supportedFeatures"].dataCompression;
        } finally {
            await worker.dispose();
        }
    }

    it("compressionIsEnabledByDefault", () => {
        assert.strictEqual(new DocumentConventions().disableTcpCompression, false);
    });

    it("processesBatchesOverACompressedConnection", async () => {
        store = await testContext.getDocumentStore();

        assert.strictEqual(await processTwoBatches(), !RavenTestContext.isPullRequest);
    });

    it("processesBatchesOverAPlainConnectionWhenCompressionIsDisabled", async () => {
        testContext.customizeStore = async s => {
            s.conventions.disableTcpCompression = true;
        };
        store = await testContext.getDocumentStore();

        assert.strictEqual(await processTwoBatches(), false);
    });
});
