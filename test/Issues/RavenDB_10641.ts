import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("RavenDB-10641", function () {

    class Document {
        public id: string;
    }

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can edit objects in metadata", async () => {
        {
            const session = store.openSession();
            const v = new Document();
            await session.store(v, "items/first");

            const meta = session.advanced.getMetadataFor(v);
            meta["Items"] = { lang: "en" };
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const v = await session.load("items/first");
            const meta = session.advanced.getMetadataFor(v);
            assert.strictEqual("en", meta["Items"]["lang"]);

            meta["Items"]["lang"] = "sv";

            assert.strictEqual("sv", meta["Items"]["lang"]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const v = await session.load("items/first");
            const meta = session.advanced.getMetadataFor(v);
            meta["test"] = "123";
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const v = await session.load("items/first");
            const meta = session.advanced.getMetadataFor(v);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const v = await session.load("items/first");
            const meta = session.advanced.getMetadataFor(v);
            assert.strictEqual("123", meta["test"]);
            assert.strictEqual("sv", meta["Items"]["lang"]);
        }
    });
});
