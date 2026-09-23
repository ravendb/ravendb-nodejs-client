import {
    BackupType,
    GetOngoingTaskInfoOperation,
    IDocumentStore,
    PeriodicBackupConfiguration,
    UpdatePeriodicBackupOperation,
    StartBackupOperation,
    GetPeriodicBackupStatusOperation,
    OngoingTaskBackup,
    GetShardedPeriodicBackupStatusOperation,
    DatabaseRecordBuilder
} from "../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, TemporaryDirContext, testContext } from "../Utils/TestUtil.js";
import path from "node:path";
import fs, { rmSync } from "node:fs";
import { assertThat } from "../Utils/AssertExtensions.js";
import { Stopwatch } from "../../src/Utility/Stopwatch.js";
import { throwError } from "../../src/Exceptions/index.js";
import { delay } from "../../src/Utility/PromiseUtil.js";
import { TimeUtil } from "../../src/Utility/TimeUtil.js";

(RavenTestContext.isPullRequest ? describe.skip : describe)("BackupsTest", function () {

    let store: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;

    beforeEach(async function () {
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    it("canBackupDatabase", async () => {
        store = await testContext.getDocumentStore();
        const backupDir = path.join(temporaryDirContext.tempDir, "backup");
        fs.mkdirSync(backupDir);

        try {
            const backupOperationResult = await configureBackup("Snapshot", backupDir, store);
            await waitForResponsibleNodeUpdate(store, backupOperationResult.taskId);

            const startBackupOperation = new StartBackupOperation(true, backupOperationResult.taskId);
            const send = await store.maintenance.send(startBackupOperation);

            assertThat(send.operationId)
                .isGreaterThan(0);

            await waitForBackup(backupDir);

            await waitForBackupStatus(store, backupOperationResult.taskId, false);

            const backupStatus = await store.maintenance.send(
                new GetPeriodicBackupStatusOperation(backupOperationResult.taskId));

            assertThat(backupStatus)
                .isNotNull();
            assertThat(backupStatus.status)
                .isNotNull();
            assertThat(backupStatus.status.lastFullBackup instanceof Date)
                .isTrue();
            assertThat(backupStatus.status.localBackup.lastFullBackup instanceof Date)
                .isTrue();
            assertThat(backupStatus.status.isEncrypted)
                .isFalse();
        } finally {
            rmSync(backupDir, { recursive: true, force: true });
        }
    });

    async function configureBackup(snapshot: BackupType, backup: string, store: IDocumentStore) {
        const backupConfiguration: PeriodicBackupConfiguration = {
            name: "myBackup",
            backupType: snapshot,
            fullBackupFrequency: "0 0 1 1 *",
            localSettings: {
                folderPath: path.resolve(backup)
            }
        };

        const operation = new UpdatePeriodicBackupOperation(backupConfiguration);
        const backupOperationResult = await store.maintenance.send(operation);
        return backupOperationResult;
    }

    it("canBackupShardedDatabase", async function () {
        testContext.customizeDbRecord = record => {
            const databaseRecord = DatabaseRecordBuilder.create().sharded("test_db", b => {
                b
                    .addShard(1, s => s.addNode("A"))
                    .addShard(2, s => s.addNode("A"))
                    .orchestrator(o => o.addNode("A"))
            }).toDatabaseRecord();

            record.sharding = databaseRecord.sharding;
        }
        let backupDir: string;
        try {
            store = await testContext.getDocumentStore();

            backupDir = path.join(temporaryDirContext.tempDir, "backupSharded");
            fs.mkdirSync(backupDir);
            const backupOperationResult = await configureBackup("Backup", backupDir, store);

            await waitForResponsibleNodeUpdate(store, backupOperationResult.taskId);

            const startBackupOperation = new StartBackupOperation(true, backupOperationResult.taskId);
            const send = await store.maintenance.send(startBackupOperation);
            const backupOperation = send.operationId;
            assertThat(backupOperation)
                .isGreaterThan(0);

            await waitForBackup(backupDir);
            await waitForBackupStatus(store, backupOperationResult.taskId, true);

            const backupResult = await store.maintenance.send(new GetShardedPeriodicBackupStatusOperation(backupOperationResult.taskId));

            assertThat(backupResult)
                .isNotNull();


            assertThat(backupResult.statuses[1].lastFullBackup instanceof Date)
                .isTrue();
            // props are asserted in waitForBackup method


        } finally {
            testContext.customizeDbRecord = null;
            rmSync(backupDir, { recursive: true, force: true });
        }
    });

    it("canSetupRetentionPolicy", async () => {
        store = await testContext.getDocumentStore();
        const backupConfiguration: PeriodicBackupConfiguration = {
            name: "myBackup",
            disabled: true,
            backupType: "Snapshot",
            fullBackupFrequency: "20 * * * *",
            backupEncryptionSettings: {
                key: "QV2jJkHCPGwjbOiXuZDCNmyyj/GE4OH8OZlkg5jQPRI=",
                encryptionMode: "UseProvidedKey"
            },
            retentionPolicy: {
                disabled: false,
                minimumBackupAgeToKeep: TimeUtil.millisToTimeSpan(3600 * 1000 * 25) // 25 hours
            }
        };

        const operation = new UpdatePeriodicBackupOperation(backupConfiguration);
        await store.maintenance.send(operation);

        const myBackup = await store.maintenance.send(
            new GetOngoingTaskInfoOperation("myBackup", "Backup")) as OngoingTaskBackup;

        assertThat(myBackup.retentionPolicy.minimumBackupAgeToKeep)
            .isEqualTo("1.01:00:00");
        assertThat(myBackup.isEncrypted)
            .isTrue();
    });
});

async function waitForResponsibleNodeUpdate(store: IDocumentStore, taskId: number) {
    await testContext.waitForValue(async () => {
        const task = await store.maintenance.send(new GetOngoingTaskInfoOperation(taskId, "Backup"));
        return task.responsibleNode != null && !!task.responsibleNode.nodeTag;
    }, true);
}

async function waitForBackup(backup: string) {
    const sw = Stopwatch.createStarted();

    while (sw.elapsed < 30_000) {
        const files = fs.readdirSync(backup);
        if (files.length) {
            // make sure backup was finished
            return;
        }
        await delay(200);
    }
}

async function waitForBackupStatus(store: IDocumentStore, taskId: number, sharded: boolean) {
    const sw = Stopwatch.createStarted();

    while (sw.elapsed < 10_000) {
        if (sharded) {
            const backupStatus = await store.maintenance.send(new GetShardedPeriodicBackupStatusOperation(taskId));

            if (backupStatus) {
                if (Object.values(backupStatus.statuses).every(x => x && x.lastFullBackup)) {
                    return;
                }
            }
        } else {
            const backupStatus = await store.maintenance.send(new GetPeriodicBackupStatusOperation(taskId));
            if (backupStatus && backupStatus.status && backupStatus.status.lastFullBackup) {
                return;
            }
        }


        await delay(200);
    }

    throwError("TimeoutException", "Unable to get expected backup status");
}
