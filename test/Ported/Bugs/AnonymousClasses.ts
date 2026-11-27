import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("AnonymousClasses", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("will not set collection", async () => {
        const session = store.openSession();
        const entity = { a: 1 };
        await session.store(entity);

        let metadata = session.advanced.getMetadataFor(entity);
        assertThat(Object.keys(metadata).includes("@collection")).isFalse();

        await session.saveChanges();

        metadata = session.advanced.getMetadataFor(entity);
        assertThat(metadata["@collection"]).isEqualTo("@empty");
    });
});
