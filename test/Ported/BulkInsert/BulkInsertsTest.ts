import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../../src";
import {createMetadataDictionary} from "../../../src/Mapping/MetadataAsDictionary";
import {CONSTANTS} from "../../../src/Constants";
import {DateUtil} from "../../../src/Utility/DateUtil";

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
            assert.equal(error.name, "BulkInsertAbortedException");
        }
    });

    it("should not accept ids ending with pipeline", async () => {
        try {
            const bulkInsert = store.bulkInsert();
            await bulkInsert.store(new FooBar(), "foobars|");

            assert.fail("Should have thrown.");
        } catch (error) {
            assert.equal(error.name, "NotSupportedException");
            assert.equal(error.message, "Document ids cannot end with '|', but was called with foobars|");
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

            assert.equal(date, metadataExpirationDate);
        } finally {
            session.dispose();
        }
    });

    it.skip("can handle nested types properly", () => {
        //TODO:
    });
});

export class FooBar {
    public name: string;
}