import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
    public name: string;
}

describe("RavenDB_10524", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("async lazy load really should not load the entire database if we find document from session", async () => {
        const doc = new Document();
        doc.id = "myDocuments/123";
        doc.name = "document";

        {
            const session = store.openSession();
            await session.store(doc);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.lazily.load<Document>(doc.id);

            await session.load<Document>(doc.id);

            const before = session.advanced.numberOfRequests;

            await session.advanced.eagerly.executeAllPendingLazyOperations();

            assertThat(session.advanced.numberOfRequests).isEqualTo(before);
        }
    });
});
