import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestDoc {
    public id: string;
    public description: string;
}

describe("RavenDB_16902", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function assertNoChangesOnLoad(description: string) {
        {
            const session = store.openSession();
            const doc = new TestDoc();
            doc.id = "doc/1";
            doc.description = description;
            await session.store(doc);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const doc = await session.load("doc/1", TestDoc);

            assertThat(session.advanced.hasChanges()).isFalse();
            assertThat(session.advanced.hasChanged(doc)).isFalse();
            assertThat(doc.description).isEqualTo(description);
        }
    }

    it("document with unicode character should not have changes on load", async () => {
        for (const description of ["\u0002", "ab\0ac"]) {
            await assertNoChangesOnLoad(description);
        }
    });

    it("document with compressed unicode string should not have changes on load", async () => {
        await assertNoChangesOnLoad("\u0003".repeat(4096));
    });
});
