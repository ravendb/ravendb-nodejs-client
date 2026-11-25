import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
}

describe("RavenDB_10568", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeDocumentWithMetadataValue() {
        const session = store.openSession();
        session.advanced.on("beforeStore", args => {
            args.getDocumentMetadata()["Value"] = "a";
        });

        await session.store(Object.assign(new Document(), { id: "my-id/123" }));
        await session.saveChanges();
    }

    it("metadata changes are available for what changed", async () => {
        await storeDocumentWithMetadataValue();

        const session = store.openSession();
        const doc = await session.load("my-id/123", Document);
        const metadata = session.advanced.getMetadataFor(doc);
        metadata["Value"] = "b";

        const changes = session.advanced.whatChanged()["my-id/123"];

        assertThat(changes.at(-1).change).isEqualTo("FieldChanged");
        assertThat(changes.at(-1).fieldName).isEqualTo("Value");
    });

    it("metadata is available on before store event", async () => {
        await storeDocumentWithMetadataValue();

        const session = store.openSession();
        const doc = await session.load("my-id/123", Document);
        assertThat(session.advanced.getMetadataFor(doc)["Value"]).isEqualTo("a");
    });

    it("metadata on new document is available on before store test", async () => {
        const session = store.openSession();
        let url: string = null;
        session.advanced.on("beforeStore", args => {
            url = args.getDocumentMetadata()["Url"];
        });

        const document = Object.assign(new Document(), { id: "my-id/123" });
        await session.store(document);

        const metadata = session.advanced.getMetadataFor(document);
        metadata["Url"] = "/my-url";

        await session.saveChanges();

        assertThat(url).isEqualTo("/my-url");
    });
});
