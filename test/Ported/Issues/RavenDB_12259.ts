import { CONSTANTS, IDocumentStore, SubscriptionBatch } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Company } from "../../Assets/Entities.js";

describe("RavenDB_12259", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function processFirstBatch(query: string, assertBatch: (batch: SubscriptionBatch<Company>) => Promise<void>) {
        const name = await store.subscriptions.create({ query });
        const worker = store.subscriptions.getSubscriptionWorker<Company>({ subscriptionName: name, documentType: Company });

        const errors: Error[] = [];
        worker.on("error", err => errors.push(err));

        await new Promise<void>((resolve, reject) => {
            worker.on("batch", (batch, callback) => {
                assertBatch(batch).then(() => {
                    resolve();
                    callback();
                }, err => {
                    reject(err);
                    callback(err);
                });
            });
        });

        await worker.disposeAsync();

        assertThat(errors).hasSize(0);
    }

    it("projectionsShouldHaveProperMetadataSetInSubscriptions", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new Company(), { name: "HR" }), "companies/1");
        await session.saveChanges();

        await processFirstBatch("from Companies as c select { name: c.name }", async batch => {
            assertThat(batch.getNumberOfItemsInBatch()).isEqualTo(1);
            assertThat(batch.items).hasSize(1);

            const item = batch.items[0];
            assertThat(item.rawResult.name).isEqualTo("HR");
            assertThat(item.metadata[CONSTANTS.Documents.Metadata.PROJECTION]).isTrue();

            const s = batch.openSession();
            assertThat(s.advanced.numberOfRequests).isEqualTo(0);
            await s.load("companies/1", Company);
            assertThat(s.advanced.numberOfRequests).isEqualTo(1);
        });

        await processFirstBatch("from Companies", async batch => {
            assertThat(batch.getNumberOfItemsInBatch()).isEqualTo(1);

            const item = batch.items[0];
            assertThat(item.rawResult.name).isEqualTo("HR");
            assertThat(CONSTANTS.Documents.Metadata.PROJECTION in item.metadata).isFalse();

            const s = batch.openSession();
            assertThat(s.advanced.numberOfRequests).isEqualTo(0);
            await s.load("companies/1", Company);
            assertThat(s.advanced.numberOfRequests).isEqualTo(0);
        });
    });
});
