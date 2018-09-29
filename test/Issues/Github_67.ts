import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    DocumentStore,
} from "../../src";

describe("Issue #67", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can pass a url with a trailing slash", async () => {
        const url = store.urls[0] + "/";
        assert.strictEqual(url[url.length - 1], "/");
        // add a trailing slash to our store's URL

        let testStore: DocumentStore;
        try {
            testStore = new DocumentStore(url, "smurfs");
            testStore.initialize();

            const session = store.openSession();

            const smurfette = { name: "Smurfette" };
            const response = await session.store(smurfette);
            await session.saveChanges();
        } finally {
            if (testStore) {
                testStore.dispose();
            }
        }
    });
});
