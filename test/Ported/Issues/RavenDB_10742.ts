import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
    public name: string;
}

describe("RavenDB_10742", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("when session already has lazy load target entities loaded, multi lazy load should work", async () => {
        const doc1 = new Document();
        doc1.name = "document 1";

        const doc2 = new Document();
        doc2.name = "document 2";

        {
            const session = store.openSession();
            await session.store(doc1);
            await session.store(doc2);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.load<Document>(doc1.id);

            const documentPromise1 = session.advanced.lazily.load<Document>(doc2.id);
            const documentPromise2 = session.advanced.lazily.load<Document>([doc1.id]);

            const loaded1 = await documentPromise1.getValue();
            const loaded2 = await documentPromise2.getValue();

            assertThat(loaded1).isNotNull();
            assertThat(loaded2).isNotNull();
            assertThat(loaded2).hasSize(1);
        }
    });
});
