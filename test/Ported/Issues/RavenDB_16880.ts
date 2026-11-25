import path from "node:path";
import {
    CONSTANTS,
    ConfigurePostgreSqlOperation,
    DatabaseRecordBuilder,
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    DocumentStore,
    GetDatabaseRecordOperation,
    IDocumentStore,
    PostgreSqlConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_16880", function () {

    let srcStore: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;

    const configuration: PostgreSqlConfiguration = {
        authentication: {
            users: [{ username: "arek", password: "foo!@22" }]
        }
    };

    beforeEach(async function () {
        srcStore = await testContext.getDocumentStore();
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(srcStore);
        temporaryDirContext.dispose();
    });

    async function configureAndExport(): Promise<string> {
        const result = await srcStore.maintenance.send(new ConfigurePostgreSqlOperation(configuration));
        assertThat(result.raftCommandIndex).isGreaterThan(0);

        const record = await srcStore.maintenance.server.send(new GetDatabaseRecordOperation(srcStore.database));
        assertThat(record.integrations.postgreSql.authentication.users).hasSize(1);
        assertThat(record.integrations.postgreSql.authentication.users[0].username).isEqualTo("arek");
        assertThat(record.integrations.postgreSql.authentication.users[0].password).isEqualTo("foo!@22");

        const exportFile = path.join(temporaryDirContext.tempDir, "export." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION);
        await (await srcStore.smuggler.export(new DatabaseSmugglerExportOptions(), exportFile)).waitForCompletion();
        return exportFile;
    }

    async function importInto(dstStore: IDocumentStore, exportFile: string) {
        await (await dstStore.smuggler.import(new DatabaseSmugglerImportOptions(), exportFile)).waitForCompletion();
        return dstStore.maintenance.server.send(new GetDatabaseRecordOperation(dstStore.database));
    }

    const licensedIt = RavenTestContext.isPullRequest ? it.skip : it;

    licensedIt("canExportAndImportPostgreSqlIntegrationConfiguration", async () => {
        const exportFile = await configureAndExport();

        const dstStore = await testContext.getDocumentStore();
        try {
            const record = await importInto(dstStore, exportFile);
            assertThat(record.integrations.postgreSql.authentication.users).hasSize(1);
            assertThat(record.integrations.postgreSql.authentication.users[0].username).isEqualTo("arek");
            assertThat(record.integrations.postgreSql.authentication.users[0].password).isEqualTo("foo!@22");
        } finally {
            await disposeTestDocumentStore(dstStore);
        }
    });

    // RavenDB_20110: a sharded database does not support the PostgreSQL integration
    licensedIt("shouldSkipUnsupportedFeaturesInShardingOnImport_PostgreSqlIntegration", async () => {
        const exportFile = await configureAndExport();

        testContext.customizeDbRecord = record => {
            record.sharding = DatabaseRecordBuilder.create()
                .sharded(record.databaseName, b => b
                    .addShard(0, s => s.addNode("A"))
                    .addShard(1, s => s.addNode("A")))
                .toDatabaseRecord()
                .sharding;
        };
        let dstStore: DocumentStore;
        try {
            dstStore = await testContext.getDocumentStore();
        } finally {
            testContext.customizeDbRecord = null;
        }

        try {
            const record = await importInto(dstStore, exportFile);
            assertThat(record.integrations).isNull();
        } finally {
            await disposeTestDocumentStore(dstStore);
        }
    });

    it("throwsOnNullConfiguration", async () => {
        await assertThrows(() => new ConfigurePostgreSqlOperation(null),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });
});
