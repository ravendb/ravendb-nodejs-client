import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import {
    DatabaseRecordWithEtag,
    IDocumentStore,
    GetDatabaseRecordOperation
} from "../../src";
import { CreateSampleDataOperation } from "../Utils/CreateSampleDataOperation";
import { assertThat } from "../Utils/AssertExtensions";

describe("GetDatabaseRecordTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get database record", async () => {
        const databaseRecord: DatabaseRecordWithEtag
            = await store.maintenance.server.send(
            new GetDatabaseRecordOperation(store.database));

        assert.ok(databaseRecord);
        assert.strictEqual(databaseRecord.databaseName, store.database);
    });

    it("can map types in database record", async () => {
        await store.maintenance.send(new CreateSampleDataOperation());

        const databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

        const history = databaseRecord.indexesHistory;
        assertThat(history)
            .isNotNull();
        const indexes = Object.keys(history);
        assertThat(indexes.length)
            .isGreaterThan(0);

        for (const index of indexes) {
            const historyItems = history[index];
            for (const item of historyItems) {
                assertThat(item.createdAt instanceof Date)
                    .isTrue();
            }
        }
    });
});
