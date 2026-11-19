import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestDocument {
    public id: string;
    public value: number;
}

const DOCUMENT_ID = "TestDocuments/1";

describe("RavenDB_4241", function () {

    let store: IDocumentStore;

    beforeEach(async () => {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        const doc = new TestDocument();
        doc.id = DOCUMENT_ID;
        doc.value = 1;
        await session.store(doc);
        await session.saveChanges();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("passing duplicate document ids to advanced lazily load should not result in documents failing to load", async () => {
        {
            const session = store.openSession();
            session.advanced.lazily.load<TestDocument>([DOCUMENT_ID, DOCUMENT_ID]);
            await session.advanced.eagerly.executeAllPendingLazyOperations();

            const doc = await session.load<TestDocument>(DOCUMENT_ID);

            assertThat(doc).isNotNull();
            assertThat(doc.value).isEqualTo(1);
        }

        {
            const session = store.openSession();
            const docs = await session.advanced.lazily.load<TestDocument>([DOCUMENT_ID, DOCUMENT_ID]).getValue();

            assertThat(docs).hasSize(1);
            assertThat(docs[DOCUMENT_ID]).isNotNull();
        }

        {
            const session = store.openSession();
            const docs = await session.advanced.lazily
                .load<TestDocument>([DOCUMENT_ID, DOCUMENT_ID, DOCUMENT_ID])
                .getValue();

            assertThat(docs).hasSize(1);
            assertThat(docs[DOCUMENT_ID]).isNotNull();
        }

        {
            const session = store.openSession();
            const docs = await session.advanced.lazily
                .load<TestDocument>([DOCUMENT_ID, "items/123", DOCUMENT_ID])
                .getValue();

            assertThat(docs).hasSize(2);
            assertThat(docs[DOCUMENT_ID]).isNotNull();
            assertThat(docs["items/123"]).isNull();
        }
    });

    it("passing duplicate document ids to load with include should not throw", async () => {
        {
            const session = store.openSession();
            const docs = await session.include("foo").load<TestDocument>([DOCUMENT_ID, DOCUMENT_ID]);

            assertThat(docs).hasSize(1);
        }

        {
            const session = store.openSession();
            const docs = await session.include("foo").load<TestDocument>([DOCUMENT_ID, "items/123", DOCUMENT_ID]);

            assertThat(docs).hasSize(2);
            assertThat(docs[DOCUMENT_ID]).isNotNull();
            assertThat(docs["items/123"]).isNull();
        }
    });
});
