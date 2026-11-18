import assert from "node:assert";
import {
    ConfigureRevisionsOperation,
    EnforceConfigurationResult,
    EnforceRevisionsConfigurationOperation,
    EnforceRevisionsParameters,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../../Utils/TestUtil.js";
import { Company } from "../../../../Assets/Entities.js";
import { assertThat, assertThrows } from "../../../../Utils/AssertExtensions.js";
import { milliseconds } from "date-fns";

describe("RevisionsStartFromEtagTests", function () {

    let store: IDocumentStore;

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function setupRevisions(minimumRevisionsToKeep: number) {
        const companiesConfiguration = new RevisionsCollectionConfiguration();
        companiesConfiguration.disabled = false;
        companiesConfiguration.minimumRevisionsToKeep = minimumRevisionsToKeep;
        const configuration = new RevisionsConfiguration();
        configuration.collections = new Map([["Companies", companiesConfiguration]]);
        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));
    }

    async function storeRevisions(id: string, count: number) {
        for (let i = 0; i < count; i++) {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "v" + i }), id);
            await session.saveChanges();
        }
    }

    async function enforce(parameters: EnforceRevisionsParameters) {
        const operation = await store.operations.send(new EnforceRevisionsConfigurationOperation(parameters));
        return operation.waitForCompletion<EnforceConfigurationResult>(milliseconds({ seconds: 30 }));
    }

    async function revisionsCount(id: string) {
        const session = store.openSession({ noCaching: true });
        return (await session.advanced.revisions.getMetadataFor(id)).length;
    }

    it("enforceRevisionConfiguration_Resume_IsIdempotent", async () => {
        store = await testContext.getDocumentStore("Revisions");

        await setupRevisions(2);
        await storeRevisions("companies/1", 5);
        await setupRevisions(1);

        const firstResult = await enforce({ includeForceCreated: false });

        assert.ok(firstResult.removedRevisions > 0, "First run should have trimmed revisions");
        assertThat(firstResult.scannedDocuments).isEqualTo(1);
        assert.deepStrictEqual(Object.keys(firstResult.lastProcessedEtags), [store.database]);
        assert.deepStrictEqual(Object.keys(firstResult.etagBarriersUsed), [store.database]);
        assert.deepStrictEqual(Object.keys(firstResult.nodeTags), [store.database]);
        assertThat(await revisionsCount("companies/1")).isEqualTo(1);

        const resumeResult = await enforce({
            includeForceCreated: false,
            continuationParameters: {
                startFromEtags: firstResult.lastProcessedEtags,
                etagBarriers: firstResult.etagBarriersUsed,
                nodeTags: firstResult.nodeTags
            }
        });

        assertThat(resumeResult.removedRevisions).isEqualTo(0);
        assertThat(await revisionsCount("companies/1")).isEqualTo(1);
    });

    it("enforceRevisionConfiguration_WithStartFromEtag_SkipsDocumentsCreatedAfterEtag", async () => {
        store = await testContext.getDocumentStore();

        await setupRevisions(2);
        await storeRevisions("companies/1", 3);
        await setupRevisions(1);

        const [node] = store.getRequestExecutor().getTopologyNodes();

        const skipped = await enforce({
            includeForceCreated: false,
            continuationParameters: {
                startFromEtags: { [store.database]: 0 },
                etagBarriers: { [store.database]: 0 },
                nodeTags: { [store.database]: node.clusterTag }
            }
        });

        assertThat(skipped.removedRevisions).isEqualTo(0);
        assertThat(skipped.scannedDocuments).isEqualTo(0);
        assertThat(await revisionsCount("companies/1")).isEqualTo(2);

        const full = await enforce({ includeForceCreated: false });

        assertThat(full.removedRevisions).isEqualTo(1);
        assertThat(await revisionsCount("companies/1")).isEqualTo(1);
    });

    it("enforceRevisionConfiguration_NodeTagValidation_RejectsWrongNode", async () => {
        store = await testContext.getDocumentStore();

        await setupRevisions(2);
        await storeRevisions("companies/1", 5);
        await setupRevisions(1);

        const firstResult = await enforce({ includeForceCreated: false });

        assertThat(firstResult.nodeTags[store.database]).isEqualTo("A");

        await enforce({
            includeForceCreated: false,
            continuationParameters: {
                startFromEtags: firstResult.lastProcessedEtags,
                etagBarriers: firstResult.etagBarriersUsed,
                nodeTags: firstResult.nodeTags
            }
        });

        await assertThrows(() => enforce({
            includeForceCreated: false,
            continuationParameters: {
                startFromEtags: firstResult.lastProcessedEtags,
                etagBarriers: firstResult.etagBarriersUsed,
                nodeTags: { [store.database]: "Z" }
            }
        }), err => {
            assert.ok(err.message.includes("node 'Z'"), err.message);
            assert.ok(err.message.includes("ForNode"), err.message);
        });
    });
});
