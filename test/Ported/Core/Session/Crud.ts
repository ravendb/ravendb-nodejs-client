import { DocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

describe("Crud", function () {

    it("store dynamic when provide delegate for dynamic collection and type should use it", async () => {
        const customCollection = "CustomCollection";
        const customType = "CustomType";

        let store: DocumentStore;
        testContext.customizeStore = async s => {
            s.conventions.findCollectionNameForObjectLiteral = () => customCollection;
            s.conventions.findJsTypeName = () => customType;
        };
        try {
            store = await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }

        try {
            const o = JSON.parse("{ \"heading\": \"Hello, world ⭐️\" }");
            {
                const session = store.openSession();
                await session.store(o, "o/1");
                await session.saveChanges();
            }

            const session = store.openSession();
            const d = await session.load("o/1");
            const metadata = session.advanced.getMetadataFor(d);
            assertThat(metadata["@collection"]).isEqualTo(customCollection);
            assertThat(metadata["Raven-Node-Type"]).isEqualTo(customType);
        } finally {
            await disposeTestDocumentStore(store);
        }
    });
});
