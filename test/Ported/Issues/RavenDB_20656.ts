import path from "node:path";
import {
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    IDocumentStore,
    SmugglerResult
} from "../../../src/index.js";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Company } from "../../Assets/Entities.js";

describe("RavenDB_20656", function () {

    let temporaryDirContext: TemporaryDirContext;

    beforeEach(() => {
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(() => temporaryDirContext.dispose());

    function assertCounts(result: SmugglerResult, skipped: number) {
        assertThat(result.documents.readCount).isEqualTo(2);
        assertThat(result.documents.skippedCount).isEqualTo(skipped);
        assertThat(result.documents.erroredCount).isEqualTo(0);

        assertThat(result.documents.attachments.readCount).isEqualTo(2);
        assertThat(result.documents.attachments.erroredCount).isEqualTo(0);

        assertThat(result.revisionDocuments.readCount).isEqualTo(2);
        assertThat(result.revisionDocuments.skippedCount).isEqualTo(skipped);
        assertThat(result.revisionDocuments.erroredCount).isEqualTo(0);

        assertThat(result.revisionDocuments.attachments.readCount).isEqualTo(2);
        assertThat(result.revisionDocuments.attachments.erroredCount).isEqualTo(0);

        assertThat(result.counters.readCount).isEqualTo(2);
        assertThat(result.counters.skippedCount).isEqualTo(skipped);
        assertThat(result.counters.erroredCount).isEqualTo(0);

        assertThat(result.timeSeries.readCount).isEqualTo(2);
        assertThat(result.timeSeries.skippedCount).isEqualTo(skipped);
        assertThat(result.timeSeries.erroredCount).isEqualTo(0);
    }

    it("should_Not_Export_TimeSeries_Counters_Attachments_Revisions_Of_Skipped_Document", async () => {
        const exportFile1 = path.join(temporaryDirContext.tempDir, "export1.ravendbdump");
        const exportFile2 = path.join(temporaryDirContext.tempDir, "export2.ravendbdump");

        let store: IDocumentStore = await testContext.getDocumentStore();
        try {
            {
                const session = store.openSession();
                const company1 = Object.assign(new Company(), { id: "companies/1", name: "HR" });
                const company2 = Object.assign(new Company(), { id: "companies/2", name: "CF" });

                await session.store(company1);
                await session.store(company2);

                session.timeSeriesFor(company1, "HR_TS").append(new Date(), 3);
                session.timeSeriesFor(company2, "CF_TS").append(new Date(), 3);

                session.advanced.attachments.store(company1, "A1", Buffer.from([1, 2, 3]));
                session.advanced.attachments.store(company2, "A1", Buffer.from([3, 2, 1]));

                session.countersFor(company1).increment("C1", 6);
                session.countersFor(company2).increment("C1", 3);

                await session.saveChanges();
            }

            {
                const session = store.openSession();
                session.advanced.revisions.forceRevisionCreationFor("companies/1");
                session.advanced.revisions.forceRevisionCreationFor("companies/2");
                await session.saveChanges();
            }

            let operation = await store.smuggler.export(new DatabaseSmugglerExportOptions(), exportFile1);
            assertCounts(await operation.waitForCompletion<SmugglerResult>(30_000), 0);

            const skipOptions = new DatabaseSmugglerExportOptions();
            skipOptions.transformScript = `
var name = this.name;
if (name == 'CF')
   throw 'skip';
`;
            operation = await store.smuggler.export(skipOptions, exportFile2);
            assertCounts(await operation.waitForCompletion<SmugglerResult>(30_000), 1);
        } finally {
            await disposeTestDocumentStore(store);
        }

        store = await testContext.getDocumentStore();
        try {
            const operation = await store.smuggler.import(new DatabaseSmugglerImportOptions(), exportFile1);
            assertCounts(await operation.waitForCompletion<SmugglerResult>(30_000), 0);
        } finally {
            await disposeTestDocumentStore(store);
        }
    });
});
