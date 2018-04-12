import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";
import { CreateSampleDataOperation } from "../../Utils/CreateSampleDataOperation";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetStatisticsCommand,
    IDocumentStore,
} from "../../../src";

describe("GetStatisticsCommand()", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can get stats", async () => {
        const executor = store.getRequestExecutor();

        const sampleDataOp = new CreateSampleDataOperation();
        await store.maintenance.send(sampleDataOp);

        await globalContext.waitForIndexing(store, store.database, null);

        const getStatsCmd = new GetStatisticsCommand();
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
            assert.ok(idx.isStale);
            assert.ok(idx.state);
            assert.ok(idx.lockMode);
            assert.ok(idx.priority);
            assert.ok(idx.type);
            assert.ok(idx.lastIndexingTime);
        }
    });
});
