import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";

import DocumentStore, {
    IDocumentStore,
    BulkInsertOperation,
    IMetadataDictionary,
    CONSTANTS,
    ObjectUtil,
} from "../../../src/index.js";
import { createMetadataDictionary } from "../../../src/Mapping/MetadataAsDictionary.js";
import { DateUtil } from "../../../src/Utility/DateUtil.js";
import { delay } from "../../../src/Utility/PromiseUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Timer } from "../../../src/Primitives/Timer.js";

describe("bulk insert", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async store => {
            store.conventions.disableTopologyUpdates = true;
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    const bulkInsertTest = async (compressed: boolean) => {
        const fooBar1 = new FooBar();
        fooBar1.name = "John Doe";

        const fooBar2 = new FooBar();
        fooBar2.name = "Jane Doe";

        const fooBar3 = new FooBar();
        fooBar3.name = "Mega John";

        const fooBar4 = new FooBar();
        fooBar4.name = "Mega Jane";

        const bulkInsert = store.bulkInsert({
            useCompression: compressed
        });

        await bulkInsert.store(fooBar1);
        await bulkInsert.store(fooBar2);
        await bulkInsert.store(fooBar3);
        await bulkInsert.store(fooBar4);
        await bulkInsert.finish();

        const session = store.openSession();
        try {
            const doc1 = await session.load<FooBar>("FooBars/1-A");
            const doc2 = await session.load<FooBar>("FooBars/2-A");
            const doc3 = await session.load<FooBar>("FooBars/3-A");
            const doc4 = await session.load<FooBar>("FooBars/4-A");

            assert.ok(doc1);
            assert.ok(doc2);
            assert.ok(doc3);
            assert.ok(doc4);

            assert.strictEqual(doc1.name, "John Doe");
            assert.strictEqual(doc2.name, "Jane Doe");
            assert.strictEqual(doc3.name, "Mega John");
            assert.strictEqual(doc4.name, "Mega Jane");

            const docsInsertedCount = await session
                .query({ collection: "fooBars" })
                .count();
            assert.strictEqual(docsInsertedCount, 4);
        } finally {
            session.dispose();
        }
    }

    it("simple bulk insert should work - no compressed", async () => {
        await bulkInsertTest(false);
    });

    it("simple bulk insert should work - compressed", async () => {
        await bulkInsertTest(true);
    });

    it("tryStoreSync", async () => {
        const bulkInsert = store.bulkInsert();
        for (let i = 0; i < 20_000; i++) {
            const x = new FooBar();
            const id = "foobar/" + i;

            if (!bulkInsert.tryStoreSync(x, id)) {
                await bulkInsert.store(x, id);
            }
        }

        await bulkInsert.finish();
    })

    it("rejects a non-awaited call only while the previous call is still awaiting", async () => {
        const concurrentCallError = { name: "BulkInsertInvalidOperationException" };

        const bulkInsert = store.bulkInsert();
        const writer = (bulkInsert as any)._writer;
        try {
            const firstStore = bulkInsert.store(new FooBar(), "foobars/1");
            await assert.rejects(bulkInsert.store(new FooBar(), "foobars/2"), concurrentCallError);
            await firstStore;

            await writer._asyncWrite;
            // a background write in flight means no call awaits a flush, so each one completes synchronously
            writer._asyncWriteDone = false;

            const counters = bulkInsert.countersFor("foobars/1");
            await Promise.all([
                bulkInsert.store(new FooBar(), "foobars/3"),
                bulkInsert.store(new FooBar(), "foobars/4"),
                counters.increment("likes"),
                counters.increment("likes")
            ]);

            const timeSeries = bulkInsert.timeSeriesFor("foobars/1", "heartrate");
            await Promise.all([
                timeSeries.append(new Date(2026, 0, 1), 60),
                timeSeries.append(new Date(2026, 0, 2), 70)
            ]);
            timeSeries.dispose();

            writer._asyncWriteDone = true;

            const storeWithGeneratedId = bulkInsert.store(new FooBar());
            await assert.rejects(bulkInsert.store(new FooBar(), "foobars/5"), concurrentCallError);
            await storeWithGeneratedId;
        } finally {
            await bulkInsert.finish();
        }

        const session = store.openSession();
        const docs = await session.load<FooBar>(["foobars/1", "foobars/2", "foobars/3", "foobars/4", "foobars/5"]);
        assert.ok(docs["foobars/1"]);
        assert.ok(!docs["foobars/2"]);
        assert.ok(docs["foobars/3"]);
        assert.ok(docs["foobars/4"]);
        assert.ok(!docs["foobars/5"]);
        assertThat(await session.query({ collection: "fooBars" }).count())
            .isEqualTo(4);
        assertThat(await session.countersFor("foobars/1").get("likes"))
            .isEqualTo(2);
        assertThat(await session.timeSeriesFor("foobars/1", "heartrate").get())
            .hasSize(2);
    });

    it ("can send heartbeats", async () => {

        const bulkInsert = store.bulkInsert();
        try {

            // access private variable
            const timer = (bulkInsert as any)._timer as Timer;
            const checkInterval = (bulkInsert as any)._heartbeatCheckInterval;

            assertThat(timer)
                .isNotNull();
            assertThat(checkInterval)
                .isEqualTo(40_000);

            timer.change(20, 20);
            (bulkInsert as any)._heartbeatCheckInterval = 20;

            await bulkInsert.store(new FooBar());

            await delay(250); //it should send heartbeats

            await bulkInsert.store(new FooBar());

        } finally {
            await bulkInsert.finish();
        }
    })

    it("can be killed early before making connection", async () => {
        const bulkInsert = store.bulkInsert();
        try {
            await bulkInsert.store(new FooBar());
            await bulkInsert.abort();

            for (let i = 0; i < 100; i++) {
                await bulkInsert.store(new FooBar());
                await delay(250);
            }

            assert.fail("Should have thrown.");
        } catch (error) {
            assert.strictEqual(error.name, "BulkInsertAbortedException", error.message);
        } finally {
            try {
                await bulkInsert.finish();
            } catch {
                // ignore
            }
        }
    });

    it("can be aborted after a while", async () => {
        const bulkInsert = store.bulkInsert();
        try {

            await bulkInsert.store(new FooBar());
            await bulkInsert.store(new FooBar());
            await bulkInsert.store(new FooBar());
            await bulkInsert.store(new FooBar());
            await delay(500);
            await bulkInsert.abort();
            for (let i = 0; i < 100; i++) {
                await bulkInsert.store(new FooBar());
                await delay(250);
            }

            assert.fail("Should have thrown.");
        } catch (error) {
            assert.strictEqual(error.name, "BulkInsertAbortedException", error.message);
        } finally {
            try {
                await bulkInsert.finish();
            } catch {
                //ignore
            }
        }
    });

    it("should not accept ids ending with pipeline", async () => {
        const bulkInsert = store.bulkInsert();
        try {

            await bulkInsert.store(new FooBar(), "foobars|");

            assert.fail("Should have thrown.");
        } catch (error) {
            assert.strictEqual(error.name, "NotSupportedException");
            assert.strictEqual(error.message, "Document ids cannot end with '|', but was called with foobars|");
        } finally {
            await bulkInsert.finish();
        }
    });

    it("can modify metadata with bulk insert", async () => {

        const date = DateUtil.utc.stringify(new Date());
        const fooBar = new FooBar();
        fooBar.name = "John Snow";

        const metadata = createMetadataDictionary({
            raw: {}
        });

        metadata[CONSTANTS.Documents.Metadata.EXPIRES] = date;

        const bulkInsert = store.bulkInsert();
        await bulkInsert.store(fooBar, metadata);
        await bulkInsert.finish();

        const session = store.openSession();
        try {
            const entity = await session.load<FooBar>("FooBars/1-A");
            const metadataExpirationDate
                = session.advanced.getMetadataFor(entity)[CONSTANTS.Documents.Metadata.EXPIRES];

            assert.strictEqual(date, metadataExpirationDate);
        } finally {
            session.dispose();
        }
    });

    it("can handle nested types properly", async () => {
        class BulkTestItem {
            public name: string;
            public created: Date;

            public constructor(name: string) {
                this.name = name;
                this.created = new Date();
            }
        }

        class BulkTestItemCollection {
            public id: string;
            public items: BulkTestItem[];

            public constructor(...names: string[]) {
                this.items = names.map(name => {
                    return new BulkTestItem(name);
                });
            }
        }

        store.conventions.registerEntityType(BulkTestItem);
        store.conventions.registerEntityType(BulkTestItemCollection);

        const entity = new BulkTestItemCollection("jon", "dany", "imp");
        {
            const bulk = store.bulkInsert();
            await bulk.store(entity);
            await bulk.finish();
        }

        {
            const session = store.openSession();
            const loaded = await session.load(entity["id"]);

            assert.ok(loaded);
            const metadata = loaded["@metadata"];
            assert.ok(metadata["@id"], entity["id"]);
            const nestedObjectTypes = metadata[CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES];
            assert.ok(nestedObjectTypes);
            assert.strictEqual(Object.keys(nestedObjectTypes).length, 6);
            for (let i = 0; i < 3; i++) {
                assert.strictEqual(nestedObjectTypes["items." + i], BulkTestItem.name);
                assert.strictEqual(nestedObjectTypes["items." + i + ".created"], "date");
            }
        }
    });

    it("canBulkInsertOnStoreWithoutTopologyUpdates", async function() {
        const fooBar1 = new FooBar();
        fooBar1.name = "John Doe";

        {
            const innerStore = new DocumentStore(store.urls, store.database);
            try {
                innerStore.conventions.disableTopologyUpdates = true;
                innerStore.initialize();

                const bulkInsert = innerStore.bulkInsert();
                try {
                    await bulkInsert.store(fooBar1);
                } finally {
                    await bulkInsert.finish();
                }

                {
                    const session = innerStore.openSession();
                    const doc1 = await session.load("FooBars/1-A", FooBar);

                    assertThat(doc1)
                        .isNotNull();
                }
            } finally {
                innerStore.dispose();
            }
        }
    });

    it.skip("[RDBC-226] can insert object literals with default conventions", async () => {
        const bulk = store.bulkInsert();
        const obj = { id: null, name: "blabli" };
        await bulk.store(obj);
        await bulk.finish();

        assert.ok(obj["id"]);
    });

    it("can handle custom entity naming conventions + object literals when findCollectionNameForObjectLiteral is specified", async () => {
        const store2 = new DocumentStore(store.urls, store.database);
        store2.conventions.serverToLocalFieldNameConverter = ObjectUtil.camel;
        store2.conventions.localToServerFieldNameConverter = ObjectUtil.pascal;
        store2.conventions.findCollectionNameForObjectLiteral = () => "test";

        store2.initialize();

        const registeredAt = new Date();
        const camelCasedObj = {
            id: null,
            name: "Jon",
            job: "white walker killer",
            fathersName: "Rhaegar",
            canUseSword: true,
            equipment: ["sword", "bow", "direwolf"],
            registeredAt
        };

        try {
            const bulk = store2.bulkInsert();
            await bulk.store(camelCasedObj);
            await bulk.finish();
        } finally {
            store2.dispose();
        }

        {
            // use case transformless store to verify doc
            const session = store.openSession();
            const loaded = await session.load<any>(camelCasedObj["id"]);
            assert.ok(loaded);
            assert.ok("Name" in loaded);
            assert.strictEqual(loaded["Name"], camelCasedObj.name);
            assert.ok("Job" in loaded);
            assert.ok("CanUseSword" in loaded);
            assert.ok("Equipment" in loaded);
            assert.ok("RegisteredAt" in loaded);
            assert.ok("FathersName" in loaded);
            assert.strictEqual(loaded["Equipment"].length, 3);
            assert.ok("Raven-Node-Type" in loaded["@metadata"]);
            assert.ok("@nested-object-types" in loaded["@metadata"]);
            assert.ok("@collection" in loaded["@metadata"]);
        }
    });
});

describe("BulkInsertOperation._typeCheckStoreArgs() properly parses arguments", () => {

    const typeCheckStoreArgs = BulkInsertOperation["_typeCheckStoreArgs"];
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const expectedCallback = () => {
        // empty
    };
    const expectedId = "id";
    const expectedMetadata = {} as IMetadataDictionary;
    const expectedNullId = null;

    it("accepts id", () => {
        const { id, getId } = typeCheckStoreArgs(expectedId);
        assert.strictEqual(id, expectedId);
        assert.ok(!getId);
    });

    it("accepts metadata", () => {
        const { id, getId, metadata } = typeCheckStoreArgs(expectedMetadata);
        assert.strictEqual(metadata, expectedMetadata);
        assert.ok(!id);
        assert.ok(getId);
    });

    it("accepts id, metadata", () => {
        const { id, getId, metadata } = typeCheckStoreArgs(expectedId, expectedMetadata);
        assert.strictEqual(metadata, expectedMetadata);
        assert.strictEqual(id, expectedId);
        assert.ok(!getId);
    });

    it("accepts null id, metadata returns getId true", () => {
        const { id, getId, metadata } = typeCheckStoreArgs(expectedNullId, expectedMetadata);
        assert.strictEqual(metadata, expectedMetadata);
        assert.ok(!id);
        assert.ok(getId);
    });

});

export class FooBar {
    public name: string;
}
