import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";
import { CreateSampleDataOperation } from "../../Utils/CreateSampleDataOperation";

import {
    GetStatisticsCommand,
    IDocumentStore,
} from "../../../src";

describe("GetStatisticsCommand()", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can get stats", async () => {
        const getStatsCmd = new GetStatisticsCommand();
        const executor = store.getRequestExecutor();

        const sampleDataOp = new CreateSampleDataOperation();
        await store.maintenance.send(sampleDataOp);

        await testContext.waitForIndexing(store, store.database, null);
        await executor.execute(getStatsCmd);

        const stats = getStatsCmd.result;
        assert.ok(stats);

        assert.ok(stats.lastDocEtag);
        assert.ok(stats.lastDocEtag > 0);

        assert.equal(stats.countOfIndexes, 3);
        assert.equal(stats.countOfDocuments, 1059);
        assert.ok(stats.countOfRevisionDocuments > 0);
        assert.equal(stats.countOfDocumentsConflicts, 0);
        assert.equal(stats.countOfUniqueAttachments, 17);

        assert.ok(stats.databaseChangeVector);
        assert.ok(stats.databaseId);
        assert.ok(stats.pager);
        assert.ok(stats.lastIndexingTime);
        assert.ok(stats.indexes);
        assert.ok(stats.sizeOnDisk.humaneSize);
        assert.ok(stats.sizeOnDisk.sizeInBytes);

        for (const idx of stats.indexes) {
            assert.ok(idx.name);
            assert.ok(idx.isStale === false, `Index ${idx.name} is stale`);
            assert.ok(idx.state);
            assert.ok(idx.lockMode);
            assert.ok(idx.priority);
            assert.ok(idx.type);
            assert.ok(idx.lastIndexingTime);
        }
    });
});
