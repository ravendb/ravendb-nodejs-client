import assert from "node:assert";
import { hoursToSeconds } from "date-fns";
import {
    AbstractJavaScriptIndexCreationTask,
    ConfigureDataArchivalOperation,
    ConfigureExpirationOperation,
    ConfigureRefreshOperation,
    ExternalReplication,
    GetDatabaseRecordOperation,
    GetDetailedStatisticsOperation,
    GetIndexesStatisticsOperation,
    GetIndexStatisticsOperation,
    GetOngoingTaskInfoOperation,
    GetStatisticsOperation,
    IDocumentStore,
    OngoingTaskBackup,
    PeriodicBackupConfiguration,
    PutConnectionStringOperation,
    RavenConnectionString,
    RavenEtlConfiguration,
    AddEtlOperation,
    StartIndexingOperation,
    StopIndexingOperation,
    Transformation,
    UpdateExternalReplicationOperation,
    UpdatePeriodicBackupOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";

describe("ConfigurationFieldsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function getDatabaseRecord() {
        return store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
    }

    it("stores maxItemsToProcess of expiration and refresh", async () => {
        const frequencyAllowedByCommunityLicense = hoursToSeconds(36);

        await store.maintenance.send(new ConfigureExpirationOperation({
            disabled: false,
            deleteFrequencyInSec: frequencyAllowedByCommunityLicense,
            maxItemsToProcess: 10
        }));
        await store.maintenance.send(new ConfigureRefreshOperation({
            disabled: false,
            refreshFrequencyInSec: frequencyAllowedByCommunityLicense,
            maxItemsToProcess: 20
        }));

        const record = await getDatabaseRecord();

        assert.strictEqual(record.expiration.maxItemsToProcess, 10);
        assert.strictEqual(record.refresh.maxItemsToProcess, 20);
    });

    it("returns stale index names in statistics", async () => {
        const index = new Users_ByName();
        await store.maintenance.send(new StopIndexingOperation());
        await index.execute(store);

        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "John" }));
        await session.saveChanges();

        assert.deepStrictEqual((await store.maintenance.send(new GetStatisticsOperation())).staleIndexes, [index.getIndexName()]);
        assert.deepStrictEqual((await store.maintenance.send(new GetDetailedStatisticsOperation())).staleIndexes, [index.getIndexName()]);

        await store.maintenance.send(new StartIndexingOperation());
        await testContext.waitForIndexing(store);

        assert.deepStrictEqual((await store.maintenance.send(new GetStatisticsOperation())).staleIndexes, []);
    });

    it("returns collection stats keyed by the server collection name in index statistics", async () => {
        const index = new Users_ByName();
        await index.execute(store);

        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "John" }));
        await session.saveChanges();
        await testContext.waitForIndexing(store);

        const stats = await store.maintenance.send(new GetIndexStatisticsOperation(index.getIndexName()));
        const [allStats] = await store.maintenance.send(new GetIndexesStatisticsOperation());

        for (const { collections } of [stats, allStats]) {
            assert.deepStrictEqual([...collections.keys()], ["Users"]);

            const collectionStats = collections.get("Users");
            assert.ok(collectionStats.lastProcessedDocumentEtag > 0);
            assert.strictEqual(collectionStats.lastProcessedTimeSeriesDeletedRangeEtag, 0);
        }
    });

    (RavenTestContext.isRavenDbServerVersion("7.2") ? it : it.skip)(
        "returns countOfRemoteAttachments in detailed statistics", async () => {
            const stats = await store.maintenance.send(new GetDetailedStatisticsOperation());

            assert.strictEqual(stats.countOfRemoteAttachments, 0);
        });

    (RavenTestContext.isPullRequest ? describe.skip : describe)("licensed tasks", function () {

        it("stores maxItemsToProcess of data archival", async () => {
            await store.maintenance.send(new ConfigureDataArchivalOperation({
                disabled: false,
                archiveFrequencyInSec: 60,
                maxItemsToProcess: 30
            }));

            assert.strictEqual((await getDatabaseRecord()).dataArchival.maxItemsToProcess, 30);
        });

        it("stores pinToMentorNode and maxReadOpsPerSecond of a periodic backup", async () => {
            const backupConfiguration: PeriodicBackupConfiguration = {
                name: "myBackup",
                disabled: true,
                backupType: "Backup",
                fullBackupFrequency: "0 0 1 1 *",
                pinToMentorNode: true,
                maxReadOpsPerSecond: 100,
                s3Settings: {
                    disabled: true,
                    bucketName: "bucket",
                    storageClass: "GlacierInstantRetrieval"
                } as PeriodicBackupConfiguration["s3Settings"]
            };

            await store.maintenance.send(new UpdatePeriodicBackupOperation(backupConfiguration));

            const backup = (await getDatabaseRecord()).periodicBackups[0];
            assert.strictEqual(backup.pinToMentorNode, true);
            assert.strictEqual(backup.maxReadOpsPerSecond, 100);
            assert.strictEqual(backup.s3Settings.storageClass, "GlacierInstantRetrieval");

            const task = await store.maintenance.send(
                new GetOngoingTaskInfoOperation("myBackup", "Backup")) as OngoingTaskBackup;
            assert.strictEqual(task.pinToMentorNode, true);
        });

        it("stores pinToMentorNode of an external replication and a RavenDB ETL", async () => {
            const connectionString = new RavenConnectionString();
            connectionString.name = "cs";
            connectionString.database = "target";
            connectionString.topologyDiscoveryUrls = store.urls;
            await store.maintenance.send(new PutConnectionStringOperation(connectionString));

            const externalReplication: ExternalReplication = {
                name: "replication",
                connectionStringName: "cs",
                database: "target",
                disabled: true,
                pinToMentorNode: true
            };
            await store.maintenance.send(new UpdateExternalReplicationOperation(externalReplication));

            const transformation: Transformation = {
                name: "script",
                collections: ["Users"]
            };
            const etlConfiguration = Object.assign(new RavenEtlConfiguration(), {
                name: "etl",
                connectionStringName: "cs",
                disabled: true,
                pinToMentorNode: true,
                transforms: [transformation]
            });
            await store.maintenance.send(new AddEtlOperation(etlConfiguration));

            const record = await getDatabaseRecord();
            assert.strictEqual(record.externalReplications[0].pinToMentorNode, true);
            assert.strictEqual(record.ravenEtls[0].pinToMentorNode, true);
        });
    });
});

class Users_ByName extends AbstractJavaScriptIndexCreationTask<User> {
    public constructor() {
        super();

        this.map(User, u => ({ name: u.name }));
    }
}
