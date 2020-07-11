import { IDocumentStore, PeriodicBackupConfiguration } from "../../src";
import { disposeTestDocumentStore, sleep, TemporaryDirContext, testContext } from "../Utils/TestUtil";
import * as path from "path";
import * as fs from "fs";
import { UpdatePeriodicBackupOperation } from "../../src/Documents/Operations/Backups/UpdatePeriodicBackupOperation";
import { StartBackupOperation } from "../../src/Documents/Operations/Backups/StartBackupOperation";
import { GetPeriodicBackupStatusOperation } from "../../src/Documents/Operations/Backups/GetPeriodicBackupStatusOperation";
import { assertThat } from "../Utils/AssertExtensions";
import * as rimraf from "rimraf";
import { Stopwatch } from "../../src/Utility/Stopwatch";

describe("BackupsTest", function () {

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

    it("canBackupDatabase", async () => {
        const backupDir = path.join(temporaryDirContext.tempDir, "backup");
        fs.mkdirSync(backupDir);

        try {
            const backupConfiguration: PeriodicBackupConfiguration = {
                name: "myBackup",
                backupType: "Snapshot",
                fullBackupFrequency: "20 * * * *",
                localSettings: {
                    folderPath: path.resolve(backupDir)
                }
            };

            const operation = new UpdatePeriodicBackupOperation(backupConfiguration);
            const backupOperationResult = await store.maintenance.send(operation);

            const startBackupOperation = new StartBackupOperation(true, backupOperationResult.taskId);
            await store.maintenance.send(startBackupOperation);

            await waitForBackup(backupDir);

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
        } finally {
            rimraf.sync(backupDir);
        }
    });
});

async function waitForBackup(backup: string) {
    const sw = Stopwatch.createStarted();

    while (sw.elapsed < 10_000) {
        const files = fs.readdirSync(backup);
        if (files.length) {
            // make sure backup was finished
            await sleep(2000);
            return;
        }
        await sleep(200);
    }


}
