import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import DocumentStore, {
    IDocumentStore, BulkInsertOperation, IMetadataDictionary,
} from "../../../src";
import { createMetadataDictionary } from "../../../src/Mapping/MetadataAsDictionary";
import { CONSTANTS } from "../../../src/Constants";
import { DateUtil } from "../../../src/Utility/DateUtil";

describe("bulk insert", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("simple bulk insert should work", async () => {
        const fooBar1 = new FooBar();
        fooBar1.name = "John Doe";

        const fooBar2 = new FooBar();
        fooBar2.name = "Jane Doe";

        const fooBar3 = new FooBar();
        fooBar3.name = "Mega John";

        const fooBar4 = new FooBar();
        fooBar4.name = "Mega Jane";

        const bulkInsert = store.bulkInsert();

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

        } finally {
            session.dispose();
        }
    });

    it("can be killed to early", async () => {
        try {
            const bulkInsert = store.bulkInsert();
            await bulkInsert.store(new FooBar());
            await bulkInsert.abort();
            await bulkInsert.store(new FooBar());

            assert.fail("Should have thrown.");
        } catch (error) {
            assert.strictEqual(error.name, "BulkInsertAbortedException");
        }
    });

    it("should not accept ids ending with pipeline", async () => {
        try {
            const bulkInsert = store.bulkInsert();
            await bulkInsert.store(new FooBar(), "foobars|");

            assert.fail("Should have thrown.");
        } catch (error) {
            assert.strictEqual(error.name, "NotSupportedException");
            assert.strictEqual(error.message, "Document ids cannot end with '|', but was called with foobars|");
        }
    });

    it("can modify metadata with bulk insert", async () => {

        const date = DateUtil.stringify(new Date());
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
            assert.strictEqual(Object.keys(nestedObjectTypes).length, 2);
            assert.strictEqual(nestedObjectTypes["items[]"], BulkTestItem.name);
            assert.strictEqual(nestedObjectTypes["items[].created"], "date");
        }
    });

    it.skip("[RDBC-226] can insert object literals with default conventions", async () => {
        const bulk = store.bulkInsert();
        const obj = { id: null, name: "blabli" };
        await bulk.store(obj);
        await bulk.finish();

        assert.ok(obj["id"]);
    });

    // tslint:disable-next-line:max-line-length
    it("can handle custom entity naming conventions + object literals when findCollectionNameForObjectLiteral is specified", async () => {
        const store2 = new DocumentStore(store.urls, store.database);
        store2.conventions.entityFieldNameConvention = "camel";
        store2.conventions.remoteEntityFieldNameConvention = "pascal";
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
            const loaded = await session.load(camelCasedObj["id"]);
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
    // tslint:disable-next-line:no-empty
    const expectedCallback = () => { };
    const expectedId = "id";
    const expectedMetadata = {} as IMetadataDictionary;
    const expectedNullId = null;

    it("accepts callback", () => {
        const { cb } = typeCheckStoreArgs(expectedCallback);
        assert.strictEqual(cb, expectedCallback);
    });

    it("accepts id", () => {
        const { id, getId } = typeCheckStoreArgs(expectedId);
        assert.strictEqual(id, expectedId);
        assert.ok(!getId);
    });

    it("accepts metadata", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(expectedMetadata);
        assert.strictEqual(metadata, expectedMetadata);
        assert.ok(!id);
        assert.ok(getId);
        assert.ok(!cb);
    });

    it("accepts id, metadata", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(expectedId, expectedMetadata);
        assert.strictEqual(metadata, expectedMetadata);
        assert.strictEqual(id, expectedId);
        assert.ok(!getId);
        assert.ok(!cb);
    });

    it("accepts id, callback", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(expectedId, expectedCallback);
        assert.strictEqual(id, expectedId);
        assert.strictEqual(cb, expectedCallback);
        assert.ok(!getId);
        assert.ok(!metadata);
    });

    it("accepts metadata, callback", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(expectedMetadata, expectedCallback);
        assert.strictEqual(metadata, expectedMetadata);
        assert.strictEqual(cb, expectedCallback);
        assert.ok(getId);
        assert.ok(!id);
    });

    it("accepts null metadata, callback", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(null, expectedCallback);
        assert.strictEqual(metadata, null);
        assert.strictEqual(cb, expectedCallback);
        assert.ok(getId);
        assert.ok(!id);
    });

    it("accepts metadata with id, callback", () => {
        const meta = { "@id": "aaa" } as any as IMetadataDictionary;
        const { id, getId, metadata, cb } = typeCheckStoreArgs(meta);
        assert.strictEqual(metadata, meta);
        assert.strictEqual(id, meta["@id"]);
        assert.ok(!getId);
        assert.ok(id);
    });

    it("accepts id, metadata, callback", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(expectedId, expectedMetadata, expectedCallback);
        assert.strictEqual(metadata, expectedMetadata);
        assert.strictEqual(cb, expectedCallback);
        assert.strictEqual(id, expectedId);
        assert.ok(!getId);
    });

    it("accepts null id, metadata, callback returns getId true", () => {
        const { id, getId, metadata, cb } = typeCheckStoreArgs(expectedNullId, expectedMetadata, expectedCallback);
        assert.strictEqual(metadata, expectedMetadata);
        assert.strictEqual(cb, expectedCallback);
        assert.ok(!id);
        assert.ok(getId);
    });

});

export class FooBar {
    public name: string;
}
