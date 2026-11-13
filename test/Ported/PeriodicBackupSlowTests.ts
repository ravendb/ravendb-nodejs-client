import path from "node:path";
import fs from "node:fs";
import {
    BackupConfiguration,
    BackupOperation,
    BackupType,
    GetPeriodicBackupStatusOperation,
    IDocumentStore,
    IOperationResult,
    RestoreBackupConfiguration,
    RestoreBackupOperation,
    DeleteDatabasesOperation
} from "../../src/index.js";
import { BackupCommand } from "../../src/Documents/Operations/Backups/BackupOperation.js";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../Utils/AssertExtensions.js";
import { User } from "../Assets/Entities.js";

interface ProcessedCount {
    processed: boolean;
    readCount: number;
    lastEtag: number;
}

interface BackupResult extends IOperationResult {
    documents: ProcessedCount;
    compareExchange: ProcessedCount;
    compareExchangeTombstones: ProcessedCount;
    conflicts: ProcessedCount;
    counters: ProcessedCount;
    databaseRecord: ProcessedCount;
    identities: ProcessedCount;
    indexes: ProcessedCount;
    revisionDocuments: ProcessedCount;
    timeSeries: ProcessedCount;
    tombstones: ProcessedCount;
    subscriptions: ProcessedCount;
    snapshotBackup: ProcessedCount;
    legacyLastAttachmentEtag: string;
    legacyLastDocumentEtag: string;
    messages: string[];
}

describe("PeriodicBackupTestsSlow", function () {

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

    for (const backupType of ["Backup", "Snapshot"] as BackupType[]) {
        it(`canCreateOneTimeBackupAndRestore (${backupType})`, async () => {
            const backupPath = path.join(temporaryDirContext.tempDir, "BackupFolder");
            const name = "EGR";

            const session = store.openSession();
            await session.store(Object.assign(new User(), { name }), "users/1");
            await session.saveChanges();

            const config: BackupConfiguration = {
                backupType,
                localSettings: {
                    folderPath: backupPath
                }
            };

            const operation = await store.maintenance.send(new BackupOperation(config));
            const backupResult = await operation.waitForCompletion<BackupResult>(15_000);

            assertThat(backupResult.documents.processed).isTrue();
            assertThat(backupResult.compareExchange.processed).isTrue();
            assertThat(backupResult.compareExchangeTombstones.processed).isTrue();
            assertThat(backupResult.conflicts.processed).isTrue();
            assertThat(backupResult.counters.processed).isTrue();
            assertThat(backupResult.databaseRecord.processed).isTrue();
            assertThat(backupResult.identities.processed).isTrue();
            assertThat(backupResult.indexes.processed).isTrue();
            assertThat(backupResult.legacyLastAttachmentEtag).isNull();
            assertThat(backupResult.legacyLastDocumentEtag).isNull();
            assertThat(backupResult.revisionDocuments.processed).isTrue();
            assertThat(backupResult.timeSeries.processed).isTrue();
            assertThat(backupResult.tombstones.processed).isTrue();
            assertThat(backupResult.subscriptions.processed).isTrue();
            assertThat(backupResult.documents.readCount).isEqualTo(1);
            assertThat(backupResult.messages).isNotEmpty();

            const { status } = await store.maintenance.send(new GetPeriodicBackupStatusOperation(0));
            assertThat(status.localBackup).isNotNull();
            assertThat(status.localBackup.tempFolderUsed).isFalse();
            assertThat(status.isFull).isTrue();
            assertThat(status.isEncrypted).isFalse();
            assertThat(status.uploadToAzure.skipped).isTrue();
            assertThat(status.uploadToFtp.skipped).isTrue();
            assertThat(status.uploadToGlacier.skipped).isTrue();
            assertThat(status.uploadToGoogleCloud.skipped).isTrue();
            assertThat(status.uploadToS3.skipped).isTrue();
            assertThat(status.nodeTag).isEqualTo("A");
            assertThat(status.durationInMs).isGreaterThan(0);
            assertThat(status.backupType).isEqualTo(backupType);

            if (backupType === "Backup") {
                assertThat(backupResult.snapshotBackup.processed).isFalse();
                assertThat(backupResult.documents.lastEtag).isGreaterThan(0);
            } else {
                assertThat(backupResult.snapshotBackup.processed).isTrue();
            }

            const databaseName = "restored_database-" + store.database;
            const backupLocation = path.join(backupPath, fs.readdirSync(backupPath)[0]);

            const restoreOperation = await store.maintenance.server.send(new RestoreBackupOperation({
                backupLocation,
                databaseName,
                type: "Local"
            } as RestoreBackupConfiguration));
            await restoreOperation.waitForCompletion();

            try {
                const restoredSession = store.openSession(databaseName);
                const user = await restoredSession.load<User>("users/1");
                assertThat(user.name).isEqualTo(name);
            } finally {
                await store.maintenance.server.send(new DeleteDatabasesOperation({
                    databaseNames: [databaseName],
                    hardDelete: true
                }));
            }
        });
    }

    it("manualBackup_WhenDefinesNoDestinations_ShouldThrowsOnServerAsWell", async () => {
        const config: BackupConfiguration = { backupType: "Backup" };

        await assertThrows(
            () => store.getRequestExecutor().execute(new BackupCommand(config)),
            err => assertThat(err.message).contains("The backup configuration target no destinations"));
    });

    it("oneTimeBackupWithInvalidConfigurationShouldThrow", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "EGR" }), "users/1");
        await session.saveChanges();

        const config: BackupConfiguration = {
            backupType: "Backup",
            localSettings: null
        };

        await assertThrows(
            async () => store.maintenance.send(new BackupOperation(config)),
            err => assertThat(err.name).isEqualTo("InvalidOperationException"));
    });

    it("rejects destinations that are disabled or have no target", async () => {
        const configs: BackupConfiguration[] = [
            { localSettings: { folderPath: "  " } },
            { localSettings: { folderPath: "/backups", disabled: true } },
            { s3Settings: { bucketName: "" } as BackupConfiguration["s3Settings"] }
        ];

        for (const config of configs) {
            await assertThrows(
                async () => new BackupOperation(config),
                err => assertThat(err.name).isEqualTo("InvalidOperationException"));
        }
    });
});
