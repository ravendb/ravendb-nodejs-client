import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";
import {
    DatabaseRecordWithEtag,
    IDocumentStore,
    GetDatabaseRecordOperation,
    IndexDefinition,
    PutIndexesOperation
} from "../../src/index.js";
import { CreateSampleDataOperation } from "../Utils/CreateSampleDataOperation.js";
import { assertThat } from "../Utils/AssertExtensions.js";

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
        assert.strictEqual(databaseRecord.databaseState, "Normal");
        assert.strictEqual(databaseRecord.databaseName, store.database);
    });

    it("can map types in database record", async () => {
        await store.maintenance.send(new CreateSampleDataOperation(["Documents", "Indexes"]));

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

    it("keeps server casing of dictionary keys containing dots", async () => {
        const indexName = "Users/By.Name";
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = indexName;
        indexDefinition.maps = new Set(["from u in docs.Users select new { u.Name }"]);
        indexDefinition.fields = { Name: { storage: "Yes" } };
        indexDefinition.configuration = { "Indexing.MapTimeoutInSec": "30" };
        indexDefinition.additionalSources = { "Helper.Src": "namespace Helpers { public static class Helper {} }" };
        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        {
            const session = store.openSession();
            await session.store({ Name: "John", Address: { City: "Paris" } }, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.query({ collection: "Users" })
                .whereEquals("Address.City", "Paris")
                .whereEquals("Name", "John")
                .all();
        }

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

        assert.deepStrictEqual(Object.keys(record.indexes), [indexName]);
        assert.deepStrictEqual(Object.keys(record.indexesHistory), [indexName]);

        const index = record.indexes[indexName];
        assert.strictEqual(index.name, indexName);
        assert.strictEqual(index.fields.Name.storage, "Yes");
        assert.strictEqual(index.configuration["Indexing.MapTimeoutInSec"], "30");
        assert.deepStrictEqual(Object.keys(index.additionalSources), ["Helper.Src"]);

        const historyDefinition = record.indexesHistory[indexName][0].definition;
        assert.strictEqual(historyDefinition.fields.Name.storage, "Yes");
        assert.strictEqual(historyDefinition.configuration["Indexing.MapTimeoutInSec"], "30");
        assert.ok(record.indexesHistory[indexName][0].createdAt instanceof Date);

        const autoIndexNames = Object.keys(record.autoIndexes);
        assert.strictEqual(autoIndexNames.length, 1);
        const autoIndex = record.autoIndexes[autoIndexNames[0]];
        assert.strictEqual(autoIndexNames[0], autoIndex.name);
        assert.ok(autoIndex.name.includes("Address.City"));
        assert.deepStrictEqual(Object.keys(autoIndex.mapFields).sort(), ["Address.City", "Name"]);
        assert.strictEqual(autoIndex.mapFields["Address.City"].indexing, "Default");
    });
});
