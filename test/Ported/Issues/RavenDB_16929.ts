import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_16929Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("documentWithStringWithNullCharacterAtEndShouldNotHaveChangeOnLoad", async () => {
        {
            const session = store.openSession();
            const doc = new TestDoc();
            doc.id = "doc/1";
            doc.descriptionChar = "a";
            doc.description = "TestString\0";
            await session.store(doc);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const doc = await session.load("doc/1", TestDoc);
            const t = doc.description;
            assertThat(session.advanced.hasChanges())
                .isFalse();
            assertThat(session.advanced.hasChanged(doc))
                .isFalse();
        }
    });

    it("documentWithEmptyCharShouldNotHaveChangeOnLoad", async () => {
        {
            const session = store.openSession();
            const doc = new TestDoc();
            doc.id = "doc/1";
            await session.store(doc);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const doc = await session.load("doc/1", TestDoc);
            assertThat(session.advanced.hasChanges())
                .isFalse();
            assertThat(session.advanced.hasChanged(doc))
                .isFalse();
        }
    })
});

class TestDoc {
    descriptionChar: string;
    id: string;
    description: string;
}
