import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("Issue #315", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use complex multi byte characters on load", async () => {

        const str = '🐛'.repeat(50_000);
        {
            const session = store.openSession();
            const doc = {'str': str};
            await session.store(doc, "items/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const item = await session.load("items/1");
            assert.ok(item);
            assert.strictEqual(item['str'], str);
        }

        {
            const session = store.openSession();
            const item = (await session.advanced.rawQuery("from @all_docs").all())[0];
            assert.strictEqual(item['str'], str);
        }
    });
});
