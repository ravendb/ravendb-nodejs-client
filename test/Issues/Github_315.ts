import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    DocumentStore,
} from "../../src";

describe("Issue #315", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use complex multi byte characters on load", async () => {

        var str = '🐛'.repeat(50_000);
        {
            var session = store.openSession();
            var doc = {'str': str};
            await session.store(doc, "items/1");
            await session.saveChanges();
        }

        {
            var session = store.openSession();
            var item = await session.load("items/1");
            assert.strictEqual(item['str'], str);
        }

        {
            var session = store.openSession();
            var item = (await session.advanced.rawQuery("from @all_docs").all())[0];
            assert.strictEqual(item['str'], str);
        }
    });
});
