import path from "node:path";
import {
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    GetStatisticsOperation,
    SmugglerResult
} from "../../../src/index.js";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Order } from "../../Assets/Entities.js";

describe("RavenDB_13491", function () {

    let temporaryDirContext: TemporaryDirContext;

    beforeEach(() => {
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(() => temporaryDirContext.dispose());

    it("should_report_errors_on_attempt_to_import_counter_of_non_existing_document", async () => {
        const file = path.join(temporaryDirContext.tempDir, "export.ravendbdump");
        const store1 = await testContext.getDocumentStore();
        const store2 = await testContext.getDocumentStore();

        try {
            const session = store1.openSession();
            await session.store(new Order(), "orders/1");
            await session.store(new Order(), "orders/2");
            session.countersFor("orders/1").increment("downloads", 100);
            session.countersFor("orders/2").increment("downloads", 200);
            await session.saveChanges();

            const exportOptions = new DatabaseSmugglerExportOptions();
            exportOptions.operateOnTypes = exportOptions.operateOnTypes.filter(type => type !== "Documents");

            const exportOperation = await store1.smuggler.export(exportOptions, file);
            const exportResult = await exportOperation.waitForCompletion<SmugglerResult>(300_000);

            assertThat(exportResult.documents.readCount).isEqualTo(0);
            assertThat(exportResult.counters.readCount).isEqualTo(2);

            const importOperation = await store2.smuggler.import(new DatabaseSmugglerImportOptions(), file);
            const importResult = await importOperation.waitForCompletion<SmugglerResult>(300_000);

            assertThat(importResult.documents.readCount).isEqualTo(0);
            assertThat(importResult.counters.readCount).isEqualTo(2);
            assertThat(importResult.counters.erroredCount).isEqualTo(2);

            for (const id of ["orders/1", "orders/2"]) {
                assertThat(importResult.messages.some(message =>
                    message.includes(`Document '${id}' does not exist. Cannot operate on counters of a missing document`))).isTrue();
            }

            const stats = await store2.maintenance.send(new GetStatisticsOperation());
            assertThat(stats.countOfDocuments).isEqualTo(0);
            assertThat(stats.countOfCounterEntries).isEqualTo(0);
        } finally {
            await disposeTestDocumentStore(store1);
            await disposeTestDocumentStore(store2);
        }
    });
});
