import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { User } from "../Assets/Entities";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("RavenDB-10566", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("should be available", async () => {
        let name;
        store.addSessionListener("afterSaveChanges", evnt => {
            name = evnt.documentMetadata["name"];
        });

        const session = store.openSession();
        const user = new User();
        user.name = "Oren";
        await session.store(user, "users/oren");

        const metadata = session.advanced.getMetadataFor(user);
        metadata["name"] = "FooBar";

        await session.saveChanges();

        assert.equal("FooBar", name);
    });
});
