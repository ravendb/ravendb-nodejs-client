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
} from "../../src";
import { User } from "../Assets/Entities";

describe("session.exists()", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can tell if doc exists ", async () => {
        {
            const session = store.openSession();
            const idan = Object.assign(new User(), { name: "Idan" });
            const shalom = Object.assign(new User(), { name: "Shalom" });

            await session.store(idan, "users/1");
            await session.store(shalom, "users/2");
            await session.saveChanges();
        }
        
        {
            const session = store.openSession();
            assert.equal(await session.advanced.exists("users/1"), true);
            assert.equal(await session.advanced.exists("users/10"), false);

            await session.load("users/2", User);
            assert.equal(await session.advanced.exists("users/2"),  true);

        }
    });
}); 
