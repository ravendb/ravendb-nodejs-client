import * as assert from "assert";
import {testContext, disposeTestDocumentStore} from "../Utils/TestUtil";

import {DocumentStore, IDocumentStore, GetDatabaseNamesOperation} from "../../src";

describe("RDBC-203", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can send server operations if db used in DocumentStore ctor does not exist", async function () {
        let store2;
        try {
            store2 = new DocumentStore(store.urls, "no_such_db");
            store2.initialize();
            await store2.maintenance.server.send(new GetDatabaseNamesOperation(0, 20));
        } catch (err) {
            assert.fail(`It should not throw, yet we got : ${err}`);
        } finally {
            if (store2) {
                store2.dispose();
            }
        }
    });
});
