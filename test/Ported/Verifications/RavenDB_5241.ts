import assert from "node:assert";
import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestDocument {
    public id: string;
    public value: number;
}

const document1Id = "TestDocuments/1";
const document2Id = "TestDocuments/2";

describe("RavenDB_5241", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeTestDocumentsIfMissing(): Promise<void> {
        const session = store.openSession();
        const existing1 = await session.load(document1Id, TestDocument);
        if (!existing1) {
            await session.store(Object.assign(new TestDocument(), { id: document1Id, value: 1 }));
        }

        const existing2 = await session.load(document2Id, TestDocument);
        if (!existing2) {
            await session.store(Object.assign(new TestDocument(), { id: document2Id, value: 2 }));
        }

        await session.saveChanges();
    }

    it("loading documents with transformer duplicate ids", async () => {
        await storeTestDocumentsIfMissing();

        const session = store.openSession();
        const docs = await session.load<TestDocument>(
            [document1Id, document1Id, document2Id, document1Id, document2Id]);
        assertThat(Object.keys(docs).length).isEqualTo(2);
        assertThat(docs[document1Id].value).isEqualTo(1);
        assertThat(docs[document2Id].value).isEqualTo(2);
    });

    it("loading documents with transformer duplicate ids and non existing document", async () => {
        await storeTestDocumentsIfMissing();

        const session = store.openSession();
        const docs = await session.load<TestDocument>(
            [document1Id, document1Id, "no_document", document2Id, document1Id, document2Id]);
        assertThat(Object.keys(docs).length).isEqualTo(3);
        assertThat(docs[document1Id].value).isEqualTo(1);
        assertThat(docs[document2Id].value).isEqualTo(2);
        assert.strictEqual(docs["no_document"], null);
    });
});
