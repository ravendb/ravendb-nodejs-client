import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThrows } from "../../Utils/AssertExtensions";
import * as assert from "assert";


describe("RavenDB-12790", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("lazyQueryAgainstMissingIndex", async () => {
        {
            const session = store.openSession();

            const document = Object.assign(new Document(), { name: "name" });
            await session.store(document);
            await session.saveChanges();
        }

        // intentionally not creating the index that we query against

        {
            const session = store.openSession();
            await assertThrows(async () => session.query<Document>({ indexName: "DocumentIndex" })
                .all(), e => {
                assert.strictEqual("IndexDoesNotExistException", e.name);
            });

            const lazyQuery = session.query<Document>({ indexName: "DocumentIndex" })
                .lazily();

            await assertThrows(async () => await lazyQuery.getValue(), e => {
                assert.strictEqual("IndexDoesNotExistException", e.name);
            });
        }
    })
});

class Document {
    public name: string;
}