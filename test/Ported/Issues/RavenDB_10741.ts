import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
    public name: string;
}

describe("RavenDB_10741", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("lazy loading with duplicate ids when already in session should succeed", async () => {
        const doc = new Document();
        doc.name = "document";

        {
            const session = store.openSession();
            await session.store(doc);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let loaded = await session.load<Document>([doc.id, doc.id]);
            assertThat(loaded).hasSize(1);
            assertThat(loaded).containsKey(doc.id);

            loaded = await session.advanced.lazily.load<Document>([doc.id, doc.id]).getValue();
            assertThat(loaded).hasSize(1);
            assertThat(loaded).containsKey(doc.id);
        }
    });
});
