import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { milliseconds } from "date-fns";
import {
    ConfigureTimeSeriesOperation,
    DeleteDatabasesOperation,
    GetDatabaseRecordOperation,
    GetOngoingTaskInfoOperation,
    GetPeriodicBackupStatusOperation,
    IDocumentStore,
    OperationCompletionAwaiter,
    RawTimeSeriesPolicy,
    RestoreBackupConfiguration,
    RestoreBackupOperation,
    StartBackupOperation,
    TimeSeriesCollectionConfiguration,
    TimeSeriesConfiguration,
    TimeSeriesPolicy,
    TimeValue,
    UpdatePeriodicBackupOperation
} from "../../../../../src/index.js";
import { User } from "../../../../Assets/Entities.js";
import { disposeTestDocumentStore, RavenTestContext, TemporaryDirContext, testContext } from "../../../../Utils/TestUtil.js";

(RavenTestContext.isPullRequest ? describe.skip : describe)("PeriodicBackupTestsSlow", function () {

    let store: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;
    let backupPath: string;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        temporaryDirContext = new TemporaryDirContext();
        backupPath = path.join(temporaryDirContext.tempDir, "BackupFolder");
        fs.mkdirSync(backupPath);
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    it("restoreSnapshotWithTimeSeriesCollectionConfiguration_WhenConfigurationInFirstSnapshot", async () => {
        const timeSeriesConfiguration = createTimeSeriesConfiguration();
        await store.maintenance.send(new ConfigureTimeSeriesOperation(timeSeriesConfiguration));

        const taskId = await createSnapshotBackupTask();
        await runBackup(taskId, true);

        await restoreAndCheckTimeSeriesConfiguration(timeSeriesConfiguration);
    });

    it("restoreSnapshotWithTimeSeriesCollectionConfiguration_WhenConfigurationInIncrementalSnapshot", async () => {
        const entity = new User();
        {
            const session = store.openSession();
            await session.store(entity);
            await session.saveChanges();
        }

        const taskId = await createSnapshotBackupTask();
        await runBackup(taskId, true);
        const statusLastEtag = (await store.maintenance.send(new GetPeriodicBackupStatusOperation(taskId))).status.lastEtag;

        const timeSeriesConfiguration = createTimeSeriesConfiguration();
        await store.maintenance.send(new ConfigureTimeSeriesOperation(timeSeriesConfiguration));
        await runBackup(taskId, false);

        {
            const session = store.openSession();
            session.advanced.patch(entity.id, "name", "Patched");
            await session.saveChanges();
        }
        await runBackup(taskId, false);

        const status = (await store.maintenance.send(new GetPeriodicBackupStatusOperation(taskId))).status;
        assert.ok(status.lastEtag > statusLastEtag, "status.lastEtag > statusLastEtag");

        await restoreAndCheckTimeSeriesConfiguration(timeSeriesConfiguration);
    });

    function createTimeSeriesConfiguration() {
        const users = new TimeSeriesCollectionConfiguration();
        users.rawPolicy = new RawTimeSeriesPolicy(TimeValue.ofHours(96));
        users.policies = [new TimeSeriesPolicy("BySecond", TimeValue.ofSeconds(1))];

        const configuration = new TimeSeriesConfiguration();
        configuration.collections.set("Users", users);
        configuration.policyCheckFrequencyInMs = milliseconds({ seconds: 1 });
        return configuration;
    }

    async function createSnapshotBackupTask() {
        const { taskId } = await store.maintenance.send(new UpdatePeriodicBackupOperation({
            backupType: "Snapshot",
            fullBackupFrequency: "0 0 1 1 *",
            localSettings: {
                folderPath: backupPath
            }
        }));

        await testContext.waitForValue(async () => {
            const task = await store.maintenance.send(new GetOngoingTaskInfoOperation(taskId, "Backup"));
            return !!task.responsibleNode?.nodeTag;
        }, true);

        return taskId;
    }

    async function runBackup(taskId: number, isFullBackup: boolean) {
        const backupOperation = await store.maintenance.send(new StartBackupOperation(isFullBackup, taskId));
        await new OperationCompletionAwaiter(
            store.getRequestExecutor(), store.conventions, backupOperation.operationId, backupOperation.responsibleNode)
            .waitForCompletion();
    }

    async function restoreAndCheckTimeSeriesConfiguration(timeSeriesConfiguration: TimeSeriesConfiguration) {
        const restoredDatabaseName = store.database + "-restored";

        const restoreOperation = await store.maintenance.server.send(new RestoreBackupOperation({
            backupLocation: path.join(backupPath, fs.readdirSync(backupPath)[0]),
            databaseName: restoredDatabaseName,
            type: "Local"
        } as RestoreBackupConfiguration));
        await restoreOperation.waitForCompletion();

        try {
            const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(restoredDatabaseName));
            const actual = record.timeSeries;

            assert.ok(actual);
            assert.strictEqual(actual.collections.size, timeSeriesConfiguration.collections.size);
            assert.strictEqual(actual.policyCheckFrequencyInMs, timeSeriesConfiguration.policyCheckFrequencyInMs);

            for (const [key, expectedCollection] of timeSeriesConfiguration.collections) {
                const actualCollection = actual.collections.get(key);
                assert.ok(actualCollection);
                assert.deepStrictEqual(actualCollection.policies.map(describePolicy), expectedCollection.policies.map(describePolicy));
                assert.strictEqual(actualCollection.rawPolicy.name, expectedCollection.rawPolicy.name);
                assert.strictEqual(actualCollection.rawPolicy.retentionTime.toString(), expectedCollection.rawPolicy.retentionTime.toString());
            }
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [restoredDatabaseName],
                hardDelete: true
            }));
        }
    }
});

function describePolicy(policy: TimeSeriesPolicy) {
    return [policy.name, policy.retentionTime.toString(), policy.aggregationTime.toString()];
}
