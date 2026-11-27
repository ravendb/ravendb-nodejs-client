import { CONSTANTS, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_12034", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("stored object should not get collection metadata", async () => {
        const session = store.openSession();
        const marker = {};

        await session.store(marker, "markers/1");

        const metadata = session.advanced.getMetadataFor(marker);

        assertThat(CONSTANTS.Documents.Metadata.COLLECTION in metadata).isFalse();
    });
});
