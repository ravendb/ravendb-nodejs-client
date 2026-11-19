import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("Kwoodard", function () {

    it("can set use optimistic concurrency globally", async () => {
        testContext.customizeStore = async s => {
            s.conventions.useOptimisticConcurrency = true;
        };
        let store: IDocumentStore;
        try {
            store = await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }
        try {
            const session = store.openSession();
            assertThat(session.advanced.useOptimisticConcurrency).isTrue();
        } finally {
            await disposeTestDocumentStore(store);
        }
    });
});
