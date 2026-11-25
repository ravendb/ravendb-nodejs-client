import assert from "node:assert";
import {
    DisableIndexOperation,
    GetIndexesStatisticsOperation,
    GetIndexStatisticsOperation,
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class Item1 {
    public constructor(public refId2: string, public refId3: string, public prop: string) {
    }
}

class Item2 {
    public constructor(public refId: string, public prop: string) {
    }
}

class Item3 {
    public constructor(public refId: string, public prop: string) {
    }
}

const indexMaps = {
    SingleCollectionLoad: [
        `from doc in docs.Item1s
         let loadDocument = LoadDocument(doc.RefId2, "Item2s")
         select new { Current = doc.Prop, Loaded2 = loadDocument.Prop }`
    ],
    MultipleCollectionLoad: [
        `from doc in docs.Item1s
         let loadDocument = LoadDocument(doc.RefId2, "Item2s")
         let loadDocument2 = LoadDocument(doc.RefId3, "Item3s")
         select new { Current = doc.Prop, Loaded2 = loadDocument.Prop, Loaded3 = loadDocument2.Prop }`
    ],
    MultiMapLoad: [
        `from doc in docs.Item1s
         let loadDocument3 = LoadDocument(doc.RefId2, "Item2s")
         select new { Current = doc.Prop, Loaded = loadDocument3.Prop }`,
        `from doc in docs.Item2s
         let loadDocument = LoadDocument(doc.RefId, "Item3s")
         select new { Current = doc.Prop, Loaded = loadDocument.Prop }`
    ],
    MultiMapLoadWithRepetition: [
        `from doc in docs.Item1s
         let loadDocument3 = LoadDocument(doc.RefId2, "Item3s")
         select new { Current = doc.Prop, Loaded = loadDocument3.Prop }`,
        `from doc in docs.Item2s
         let loadDocument = LoadDocument(doc.RefId, "Item3s")
         select new { Current = doc.Prop, Loaded = loadDocument.Prop }`
    ]
};

describe("RavenDB_22196", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function arrange(indexName: keyof typeof indexMaps, disableIndex: boolean) {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = indexName;
        indexDefinition.maps = new Set(indexMaps[indexName]);
        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        const session = store.openSession();
        await session.store(new Item1("item2/1", "item3/1", "Item1/1"), "item1/1");
        await session.store(new Item2("item2/1", "item3/1"), "item2/1");
        await session.store(new Item3("item2/1", "item3/1"), "item3/1");
        await session.saveChanges();

        await testContext.waitForIndexing(store);

        if (disableIndex) {
            await store.maintenance.send(new DisableIndexOperation(indexName));
        }
    }

    for (const disableIndex of [true, false]) {
        const variant = `(disableIndex: ${disableIndex})`;

        it(`singleCollectionLoadTest ${variant}`, async () => {
            await arrange("SingleCollectionLoad", disableIndex);

            const indexStats = await store.maintenance.send(new GetIndexStatisticsOperation("SingleCollectionLoad"));

            assert.deepStrictEqual(indexStats.referencedCollections, ["Item2s"]);
        });

        it(`multipleCollectionLoadTest ${variant}`, async () => {
            await arrange("MultipleCollectionLoad", disableIndex);

            const indexStats = await store.maintenance.send(new GetIndexStatisticsOperation("MultipleCollectionLoad"));

            assert.deepStrictEqual([...indexStats.referencedCollections].sort(), ["Item2s", "Item3s"]);
        });

        it(`multiMapLoadTest ${variant}`, async () => {
            await arrange("MultiMapLoad", disableIndex);

            const indexStats = await store.maintenance.send(new GetIndexStatisticsOperation("MultiMapLoad"));

            assert.deepStrictEqual([...indexStats.referencedCollections].sort(), ["Item2s", "Item3s"]);
        });

        it(`multiMapLoadWithRepetitionTest ${variant}`, async () => {
            await arrange("MultiMapLoadWithRepetition", disableIndex);

            const indexStats =
                await store.maintenance.send(new GetIndexStatisticsOperation("MultiMapLoadWithRepetition"));

            assert.deepStrictEqual(indexStats.referencedCollections, ["Item3s"]);
        });
    }

    it("index statistics carry staleness, validity and dates", async () => {
        await arrange("SingleCollectionLoad", false);

        const single = await store.maintenance.send(new GetIndexStatisticsOperation("SingleCollectionLoad"));
        const [fromList] = await store.maintenance.send(new GetIndexesStatisticsOperation());

        for (const indexStats of [single, fromList]) {
            assert.strictEqual(indexStats.isStale, false);
            assert.strictEqual(indexStats.isInvalidIndex, false);
            assert.ok(indexStats.createdTimestamp instanceof Date);
            assert.ok(indexStats.lastIndexingTime instanceof Date);
            assert.ok(indexStats.createdTimestamp <= indexStats.lastIndexingTime);
            assert.deepStrictEqual(indexStats.referencedCollections, ["Item2s"]);
        }
    });
});
