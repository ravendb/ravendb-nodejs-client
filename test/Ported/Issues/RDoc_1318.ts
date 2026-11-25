import { DocumentStore, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RDoc_1318", function () {

    let store: IDocumentStore;
    let storeWithoutDatabase: DocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        storeWithoutDatabase?.dispose();
        await disposeTestDocumentStore(store);
    });

    it("opening session without database should throw meaningful exception", async () => {
        storeWithoutDatabase = new DocumentStore(store.urls, null);
        storeWithoutDatabase.initialize();

        await assertThrows(() => storeWithoutDatabase.openSession(), err => {
            assertThat(err.name).isEqualTo("InvalidOperationException");
            assertThat(err.message)
                .contains("Cannot open a Session without specifying a name of a database to operate on");
        });
    });
});
