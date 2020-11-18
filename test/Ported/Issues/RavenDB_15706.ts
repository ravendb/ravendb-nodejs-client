import { DocumentStore, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_15706", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("bulkInsertWithoutDB", async () => {
        const outerStore = await testContext.getDocumentStore();
        try {
            const store = new DocumentStore(outerStore.urls, null);
            store.initialize();

            await assertThrows(() => store.bulkInsert(), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidOperationException");
            })
        } finally {
            outerStore.dispose();
        }
    });
});