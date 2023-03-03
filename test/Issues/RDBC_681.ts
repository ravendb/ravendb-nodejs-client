import { IDocumentStore } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import * as assert from "assert";


describe("[RDBC-681] @nested-object-types doesn’t store type information for newly added fields on update", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("sets correct nested-object-types", async () => {
        class DateDoc {
            public firstDate: Date
            public secondDate: Date
        }

        {
            const session = store.openSession();
            const dateDoc = new DateDoc();
            dateDoc.firstDate = new Date();

            await session.store(dateDoc, "date/1");
            await session.saveChanges();
        }
        const session = store.openSession()
        const doc = await session.load<DateDoc>("date/1")
        doc.secondDate = new Date()
        await session.saveChanges()
        const metadata = session.advanced.getMetadataFor(doc)
        assert.strictEqual(doc.firstDate instanceof Date, true)
        assert.strictEqual(doc.secondDate instanceof Date, true)
        assert.strictEqual(metadata["@nested-object-types"]["firstDate"], "date")
        assert.strictEqual(metadata["@nested-object-types"]["secondDate"], "date")

        const session2 = store.openSession()
        const loaded = await session2.load<DateDoc>("date/1")
        const loadedMetadata = session2.advanced.getMetadataFor(loaded)
        assert.strictEqual(loaded.firstDate instanceof Date, true)
        assert.strictEqual(loaded.secondDate instanceof Date, true)
        assert.strictEqual(loadedMetadata["@nested-object-types"]["firstDate"], "date")
        assert.strictEqual(loadedMetadata["@nested-object-types"]["secondDate"], "date")
    })
});

