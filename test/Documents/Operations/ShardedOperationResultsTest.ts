import path from "node:path";
import assert from "node:assert";
import { milliseconds } from "date-fns";
import {
    BackupOperation,
    DatabaseSmugglerExportOptions,
    IDocumentStore,
    IShardedOperationResult,
    IShardNodeOperationResult,
    ShardedBackupResult,
    ShardedSmugglerResult,
    SmugglerResult
} from "../../../src/index.js";
import { getShardedDocumentStore } from "../../Utils/ShardingTestUtil.js";
import { disposeTestDocumentStore, RavenTestContext, TemporaryDirContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("ShardedOperationResultsTest", function () {

    const documentsCount = 30;
    const timeout = milliseconds({ seconds: 30 });

    let store: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;

    beforeEach(async function () {
        store = await getShardedDocumentStore();
        temporaryDirContext = new TemporaryDirContext();

        const session = store.openSession();
        for (let i = 0; i < documentsCount; i++) {
            await session.store(Object.assign(new User(), { name: "user" + i }), "users/" + i);
        }
        await session.saveChanges();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    it("returns per-shard smuggler results for a sharded export", async () => {
        const operation = await store.smuggler.export(new DatabaseSmugglerExportOptions(),
            path.join(temporaryDirContext.tempDir, "export.ravendbdump"));
        const result = await operation.waitForCompletion<ShardedSmugglerResult>(timeout);

        assertPerShardResults(result);
        for (const shardResult of result.results) {
            assertThat(typeof shardResult.result.elapsed).isEqualTo("string");
        }
    });

    (RavenTestContext.isPullRequest ? it.skip : it)("returns per-shard backup results for a sharded one-time backup", async () => {
        const operation = await store.maintenance.send(new BackupOperation({
            localSettings: {
                folderPath: path.join(temporaryDirContext.tempDir, "backup")
            }
        }));
        const result = await operation.waitForCompletion<ShardedBackupResult>(timeout);

        assertPerShardResults(result);
        for (const shardResult of result.results) {
            assertThat(shardResult.result.localBackup.backupDirectory).isNotNull();
            assertThat(shardResult.result.snapshotBackup.skipped).isTrue();
        }
    });

    function assertPerShardResults(result: IShardedOperationResult<IShardNodeOperationResult<SmugglerResult>>) {
        assert.deepStrictEqual(result.results.map(x => x.shardNumber).sort(), [0, 1, 2]);
        for (const shardResult of result.results) {
            assertThat(shardResult.nodeTag).isEqualTo("A");
        }

        const documentsRead = result.results.reduce((sum, x) => sum + x.result.documents.readCount, 0);
        assertThat(documentsRead).isEqualTo(documentsCount);
    }
});
