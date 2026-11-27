import { GetDocumentsCommand, IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_4388", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("should cleanup cache", async () => {
        const requestExecutor = store.getRequestExecutor();

        await requestExecutor.execute(new PutDocumentCommand("keys/1", null, {}));
        await requestExecutor.execute(new GetDocumentsCommand({ id: "keys/1", conventions: store.conventions }));

        const cache = requestExecutor.cache;
        assertThat(cache.numberOfItems)
            .isGreaterThan(0);
        cache.clear();
        assertThat(cache.numberOfItems)
            .isEqualTo(0);
    });
});
