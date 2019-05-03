import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import * as assert from "assert";

describe("GitHub-204", function () {

    class Foo {
        public foo: number | undefined;
        public bar: string | undefined;
    }

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("store should save new collection, for class", async () => {
        const raw = `{
            "foo": 42,
            "bar": "lorem ipsum"
        }`;
        let docId;

        {
            const session = await store.openSession();
            const document: Foo = JSON.parse(raw); // NOTE: declaring it's Foo while it's {}

            await session.store(document, "foo/", Foo);
            await session.saveChanges();

            docId = document["id"];

            const meta = session.advanced.getMetadataFor(document);
            assert.equal(meta["@collection"], "Foos");
            assert.equal(meta["Raven-Node-Type"], "Foo");
        }

        {
            const session = await store.openSession();
            const loaded = await session.load(docId);
            const meta = session.advanced.getMetadataFor(loaded);
            assert.equal(meta["@collection"], "Foos");
            assert.equal(meta["Raven-Node-Type"], "Foo");
        }
    }); 

});
