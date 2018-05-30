import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("HttpsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getSecuredDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can connect with certificate", async () => {
        assert.equal(store.urls[0].slice(0, 5), "https");
        const session = store.openSession();
        session.store({ lastName: "Snow" }, "users/1");
        session.saveChanges();
    });
});
