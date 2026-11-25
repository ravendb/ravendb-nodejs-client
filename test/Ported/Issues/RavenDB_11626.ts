import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
}

describe("RavenDB_11626", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("exists should return false when session contains document as deleted", async () => {
        const id = "docs/1";

        {
            const session = store.openSession();
            const document = new Document();
            document.id = id;
            await session.store(document);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let doc = await session.load(id, Document);
            assertThat(doc).isNotNull();

            await session.delete(doc);
            doc = await session.load(id, Document);
            assertThat(doc).isNull();

            assertThat(await session.advanced.exists(id)).isFalse();
        }
    });
});
