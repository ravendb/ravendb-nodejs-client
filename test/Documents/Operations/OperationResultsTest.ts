import fs from "node:fs";
import path from "node:path";
import {
    AbstractCsharpIndexCreationTask,
    CompactDatabaseOperation,
    CompactionResult,
    CONSTANTS,
    CreateDatabaseOperation,
    DatabaseSmugglerExportOptions,
    DeleteDatabasesOperation,
    DocumentStore,
    IDocumentStore,
    RestoreBackupConfiguration,
    RestoreBackupOperation,
    RestoreResult,
    SmugglerResult
} from "../../../src/index.js";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";
import assert from "node:assert";

class Users_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from u in docs.Users select new { u.name }";
    }
}

describe("OperationResultsTest", function () {

    let store: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    it("returns smuggler and restore results", async () => {
        const backupPath = path.join(temporaryDirContext.tempDir, "backup");
        fs.mkdirSync(backupPath);
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "John" }), "users/1");
        await session.saveChanges();

        const exportOperation = await store.smuggler.export(new DatabaseSmugglerExportOptions(),
            path.join(backupPath, "export." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION));
        const exportResult = await exportOperation.waitForCompletion<SmugglerResult>(30_000);

        assertThat(exportResult.documents.readCount).isEqualTo(1);
        assertThat(exportResult.documents.lastEtag).isGreaterThan(0);
        assertThat(exportResult.databaseRecord.processed).isTrue();
        assertThat(typeof exportResult.elapsed).isEqualTo("string");
        assertThat(exportResult.messages).isNotEmpty();

        const restoredDatabaseName = store.database + "_restored";
        const restoreOperation = await store.maintenance.server.send(new RestoreBackupOperation({
            backupLocation: backupPath,
            databaseName: restoredDatabaseName,
            type: "Local"
        } as RestoreBackupConfiguration));

        try {
            const restoreResult = await restoreOperation.waitForCompletion<RestoreResult>(30_000);

            assertThat(restoreResult.documents.readCount).isEqualTo(1);
            assertThat(restoreResult.snapshotRestore.skipped).isTrue();
            assertThat(restoreResult.files.fileCount).isEqualTo(1);
            assertThat(typeof restoreResult.elapsed).isEqualTo("string");
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [restoredDatabaseName],
                hardDelete: true
            }));
        }
    });

    it("returns the compaction result keyed by the index names as given", async () => {
        const databaseName = store.database + "_on_disk";
        await store.maintenance.server.send(new CreateDatabaseOperation({
            databaseName,
            settings: { "RunInMemory": "false" }
        }));

        const diskStore = new DocumentStore(store.urls, databaseName);
        diskStore.initialize();

        try {
            const index = new Users_ByName();
            await index.execute(diskStore);

            const session = diskStore.openSession();
            await session.store(Object.assign(new User(), { name: "John" }), "users/1");
            await session.saveChanges();
            await testContext.waitForIndexing(diskStore);

            const operation = await diskStore.maintenance.server.send(new CompactDatabaseOperation({
                databaseName,
                documents: true,
                indexes: [index.getIndexName()]
            }));
            const result = await operation.waitForCompletion<CompactionResult>(60_000);

            assertThat(result.processed).isTrue();
            assertThat(result.sizeBeforeCompactionInMb).isGreaterThan(-1);
            assert.deepStrictEqual(Object.keys(result.indexesResults), ["Users/ByName"]);
            assertThat(result.indexesResults["Users/ByName"].processed).isTrue();
        } finally {
            diskStore.dispose();
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [databaseName],
                hardDelete: true
            }));
        }
    });
});
