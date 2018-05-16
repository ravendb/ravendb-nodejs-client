import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    DocumentStore,
} from "../../src";

describe("Issue #67", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can pass a url with a trailing slash", async () => {
        const url = store.urls[0] + "/";
        assert.equal(url[url.length - 1], "/");
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
