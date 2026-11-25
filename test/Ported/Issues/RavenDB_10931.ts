import { randomUUID } from "node:crypto";
import { DocumentStore, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Foo {
    public bar: string;
}

describe("RavenDB_10931", function () {

    let store: IDocumentStore;
    let customStore: DocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        customStore?.dispose();
        await disposeTestDocumentStore(store);
    });

    it("subscribing to onBeforeStore event should not prevent metadata to be saved", async () => {
        customStore = new DocumentStore(store.urls, store.database);
        customStore.conventions.identityPartsSeparator = "-";
        customStore.addSessionListener("beforeStore", () => {});
        customStore.initialize();

        const verificationValue = randomUUID();
        {
            const session = customStore.openSession();
            const baz = Object.assign(new Foo(), { bar: "wibble" });
            await session.store(baz);
            session.advanced.getMetadataFor(baz)["Info"] = verificationValue;
            await session.saveChanges();
        }

        {
            const session = customStore.openSession();
            const baz = await session.query(Foo).first();
            assertThat(baz.bar).isEqualTo("wibble");
            assertThat(session.advanced.getMetadataFor(baz)["Info"]).isEqualTo(verificationValue);
        }
    });
});
