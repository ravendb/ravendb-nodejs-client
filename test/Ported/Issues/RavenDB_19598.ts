import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import * as assert from "assert";

describe("RavenDB_19598Test", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));


    it("testRefreshOverload", async function () {
        {
            const session = store.openSession();

            const doc0 = new SimpleDoc();
            doc0.id = "TestDoc0";
            doc0.name = "State0";

            const doc1 = new SimpleDoc();
            doc1.id = "TestDoc1";
            doc1.name = "State1";

            const doc2 = new SimpleDoc();
            doc2.id = "TestDoc2";
            doc2.name = "State2";

            const docs: SimpleDoc[] = [doc0, doc1, doc2];

            for (const doc of docs) {
                await session.store(doc);
            }

            await session.saveChanges();

            // loading the stored docs and name field equality assertions
            const sd = await session.load(docs[0].id, SimpleDoc);
            assertThat(sd.name)
                .isEqualTo(docs[0].name);

            const sd1 = await session.load(docs[1].id, SimpleDoc);
            assertThat(sd1.name)
                .isEqualTo(docs[1].name);

            const sd2 = await session.load(docs[2].id, SimpleDoc);
            assertThat(sd2.name)
                .isEqualTo(docs[2].name);

            // changing the name fields and saving the changes

            sd.name = "grossesNashorn";
            sd1.name = "kleinesNashorn";
            sd2.name = "krassesNashorn";

            await session.saveChanges();

            // overriding locally the name fields (without saving)
            sd.name = "schwarzeKraehe";
            sd1.name = "weisseKraehe";
            sd2.name = "gelbeKraehe";

            await session.advanced.refresh([sd, sd1, sd2]);

            // equality assertion of current names and pre-override names
            assertThat(sd.name)
                .isEqualTo("grossesNashorn");
            assertThat(sd1.name)
                .isEqualTo("kleinesNashorn");
            assertThat(sd2.name)
                .isEqualTo("krassesNashorn");

            session.dispose();
        }
    });


    it("testRefreshOverloadSameDocs", async function() {
        const session = store.openSession();

        // creating document and store it

        const doc = new SimpleDoc();
        doc.id = "TestDoc0";
        doc.name = "State0";

        await session.store(doc);
        await session.saveChanges();

        // loading the stored doc and name field equality assertions
        const sd = await session.load(doc.id, SimpleDoc);
        assertThat(sd.name)
            .isEqualTo(doc.name);

        // changing the name field and saving the changes
        sd.name = "grossesNashorn";
        await session.saveChanges();

        // overriding locally the name field (without saving)
        sd.name = "schwarzeKraehe";

        await session.advanced.refresh([sd, sd, sd]);

        // equality assertion of current names and pre-override names
        assertThat(sd.name)
            .isEqualTo("grossesNashorn");
    });

    it("testRefreshOverloadWithDocDeletion", async function () {
        const session = store.openSession();

        // creating document and store it
        const doc = new SimpleDoc();
        doc.id = "TestDoc0";
        doc.name = "State0";

        const doc1 = new SimpleDoc();
        doc1.id = "TestDoc1";
        doc1.name = "State1";

        await session.store(doc);
        await session.store(doc1);
        await session.saveChanges();

        // loading the stored doc and name field equality assertions
        const sd = await session.load(doc.id, SimpleDoc);
        assertThat(sd.name)
            .isEqualTo(doc.name);

        const sd1 = await session.load(doc1.id, SimpleDoc);
        assertThat(sd1.name)
            .isEqualTo(doc1.name);

        // changing the name field and saving the changes
        sd.name = "grossesNashorn";
        sd1.name = "kleinesNashorn";
        await session.saveChanges();

        // overriding locally the name field (without saving)
        sd.name = "schwarzeKraehe";
        sd1.name = "weisseKraehe";

        {
            const session2 = store.openSession();
            await session2.delete(sd.id);
            await session2.saveChanges();
            session2.dispose();
        }

        await assertThrows(() => session.advanced.refresh([sd, sd1]), err => {
            assert.strictEqual(err.name, "InvalidArgumentException");
        });
    });
})


class SimpleDoc {
    id: string;
    name: string;
}
