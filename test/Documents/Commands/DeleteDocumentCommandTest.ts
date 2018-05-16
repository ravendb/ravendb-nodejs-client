import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    DeleteDocumentCommand,
} from "../../../src";
import { User } from "../../Assets/Entities";

describe("DeleteDocumentCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can delete document", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Marcin" });
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        const command = new DeleteDocumentCommand("users/1");
        await store.getRequestExecutor().execute(command);

        {
            const session = store.openSession();
            const loadedUser = await session.load<User>("users/1");
            assert.equal(loadedUser, null);
        }
    });

    it("can delete document by etag", async () => {

        let changeVector: string;

        {
            const session = store.openSession();
            const user: User = Object.assign(new User(), { name: "Marcin" });
            await session.store(user, "users/1");
            await session.saveChanges();

            changeVector = session.advanced.getChangeVectorFor(user);
        }

        {
            const session = store.openSession();
            const loadedUser: User = await session.load<User>("users/1");
            loadedUser.age = 5;
            await session.saveChanges();
        }

        const command = new DeleteDocumentCommand("users/1", changeVector);
        try {
            await store.getRequestExecutor().execute(command);
            assert.fail("it should have thrown ConcurrencyException");
        } catch (err) {
            assert.equal(err.name, "ConcurrencyException");
        }
    });
});
