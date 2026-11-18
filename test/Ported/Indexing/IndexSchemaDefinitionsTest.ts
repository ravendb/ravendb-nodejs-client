import assert from "node:assert";
import {
    GetDatabaseRecordOperation,
    GetIndexesOperation,
    GetIndexOperation,
    IDocumentStore,
    IndexDefinition,
    IndexType,
    PutIndexesOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";

class TestObj {
    public prop: string;
}

interface IndexResult {
    id: string;
    errors: string[];
}

const csharpMap = `from doc in docs
where MetadataFor(doc)["@collection"] != "@hilo"
select new
{
    Id = doc.Id,
    Errors = Schema.GetErrorsFor(doc)
}`;

const javaScriptMap = `map("@all_docs", (doc) => {
    let metadata = doc["@metadata"];
    if (metadata == null || metadata["@collection"] !== "@hilo")
        return {
            Id: id(doc),
            Errors: schema.getErrorsFor(doc)
        };
})`;

const propSchema = JSON.stringify({ properties: { prop: { maxLength: 10 } } });
const requiredSchema = JSON.stringify({ required: ["name"] });

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("IndexSchemaDefinitionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function indexDefinition(map: string, type: IndexType): IndexDefinition {
        const definition = new IndexDefinition();
        definition.name = "IndexWithSchemaValidation";
        definition.maps = new Set([map]);
        definition.type = type;
        definition.fields = { Errors: { storage: "Yes" } };
        definition.schemaDefinitions = { TestObjs: propSchema, orders: requiredSchema };
        return definition;
    }

    for (const [map, type] of [[csharpMap, "Map"], [javaScriptMap, "JavaScriptMap"]] as [string, IndexType][]) {
        it(`keeps schema definition keys through put and get of a ${type} index`, async () => {
            const definition = indexDefinition(map, type);
            await store.maintenance.send(new PutIndexesOperation(definition));

            const single = await store.maintenance.send(new GetIndexOperation(definition.name));
            assert.deepStrictEqual(single.schemaDefinitions, definition.schemaDefinitions);

            const [listed] = await store.maintenance.send(new GetIndexesOperation(0, 10));
            assert.deepStrictEqual(listed.schemaDefinitions, definition.schemaDefinitions);

            const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
            assert.deepStrictEqual(record.indexes[definition.name].schemaDefinitions, definition.schemaDefinitions);
            assert.deepStrictEqual(
                record.indexesHistory[definition.name][0].definition.schemaDefinitions, definition.schemaDefinitions);
        });

        it(`reports schema errors of a ${type} index`, async () => {
            const definition = indexDefinition(map, type);
            await store.maintenance.send(new PutIndexesOperation(definition));

            {
                const session = store.openSession();
                await session.store(Object.assign(new TestObj(), { prop: "0123456789a" }), "invalidDocId");
                await session.store(Object.assign(new TestObj(), { prop: "01" }), "validDocId");
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            const session = store.openSession();
            const results = await session.advanced
                .rawQuery<IndexResult>(`from index '${definition.name}' select id() as id, Errors as errors`)
                .all();
            const byId = new Map(results.map(x => [x.id, x.errors]));

            assert.strictEqual(byId.get("validDocId") ?? null, null);
            assert.strictEqual(byId.get("invalidDocId").length, 1);
            assert.match(byId.get("invalidDocId")[0], /The length of the value '0123456789a' at 'prop' should not exceed 10/);
        });
    }

    it("leaves schema definitions unset when not given", async () => {
        const definition = indexDefinition(csharpMap, "Map");
        delete definition.schemaDefinitions;
        await store.maintenance.send(new PutIndexesOperation(definition));

        const stored = await store.maintenance.send(new GetIndexOperation(definition.name));
        assert.strictEqual(stored.schemaDefinitions ?? null, null);
    });
});
