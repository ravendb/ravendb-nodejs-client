import { GetDatabaseRecordOperation, IDocumentStore } from "../../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil";
import { UpdateDocumentsCompressionConfigurationOperation } from "../../../../src/ServerWide/Operations/DocumentsCompression/UpdateDocumentsCompressionConfigurationOperation";
import { assertThat } from "../../../Utils/AssertExtensions";

(RavenTestContext.isPullRequest ? describe.skip : describe)("CompressAllCollectionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("compressAllCollectionsAfterDocsChange", async () => {
        // we are running in memory - just check if command will be send to server

        await store.maintenance.send(new UpdateDocumentsCompressionConfigurationOperation({
            compressRevisions: false,
            compressAllCollections: true
        }));

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

        const documentsCompression = record.documentsCompression;
        assertThat(documentsCompression.compressAllCollections)
            .isTrue();

        assertThat(documentsCompression.compressRevisions)
            .isFalse();
    });
});
