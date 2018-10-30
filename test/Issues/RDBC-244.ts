import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("RDBC-244", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async (store) => {
            store.conventions.findCollectionNameForObjectLiteral = x => "test";
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
    });

    it("can load more than 1024 docs in a single load", async () => {

        const items = [];
        {
            const bulk = store.bulkInsert();
            for (let i = 0; i < 1500; i++) {
                const item = {
                    name: "Margarette" + i
                };
                await bulk.store(item);
                items.push(item);
            }

            await bulk.finish();
        }
        
        const moreThan1024Ids = items.map(x => x.id);
        assert.strictEqual(moreThan1024Ids.length, 1500);

        {
            const session = store.openSession();
            const loaded = await session.load(moreThan1024Ids);
            assert.strictEqual(Object.keys(loaded).length, 1500);
            assert.ok(Object.keys(loaded)
                .reduce((result, item) => [...result, loaded[item]], [])
                .every(x => x));
        }
    });
});
