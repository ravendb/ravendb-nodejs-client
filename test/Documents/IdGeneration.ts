import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    IDocumentSession,
} from "../../src";
import { User } from "../Assets/Entities";

describe("ID generation - session.store()", function () {

    let store: IDocumentStore;
    let session: IDocumentSession;
    let user: any;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        session = store.openSession();
        user = { name: "Greg" };
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("given object literal and empty string for id, returns guid", async () => {
        await session.store(user, "");
        await session.saveChanges();
        assert.equal((user.id as string).match(/-/g).length, 4);
    });

    it("given object literal and id ending with /, returns node based id", async () => {
        await session.store(user, "users/");
        await session.saveChanges();
        assert.equal(user.id, "users/0000000000000000001-A");
    });

    it("given object literal and id ending with |, returns cluster-wide id", async () => {
        await session.store(user, "users|");
        await session.saveChanges();
        assert.equal(user.id, "users/1");
    });
});
