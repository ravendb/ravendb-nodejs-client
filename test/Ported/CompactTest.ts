import {User} from "../Assets/Entities";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    CompactSettings,
    CompactDatabaseOperation,
} from "../../src";

describe("CompactTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    // tslint:disable-next-line:no-empty
    it("can compact database", async () => {
        const session = store.openSession();
        const user1 = Object.assign(new User(), { lastName: "user1" });
        await session.store(user1, "users/1");
        await session.saveChanges();

        const compactSettings = {
            databaseName: store.database,
            documents: true
        };

        const operationAwaiter = await store.maintenance.server.send(new CompactDatabaseOperation(compactSettings));

        try {
            // we can't compact in memory database but here we just test is request was send successfully
            await operationAwaiter.waitForCompletion();
            assert.fail("It should have thrown.");
        } catch (err) {
            assert.ok(
                err.message.indexOf(
                    "Unable to cast object of type 'PureMemoryStorageEnvironmentOptions' "
                        + "to type 'DirectoryStorageEnvironmentOptions'") !== -1, "Actual error: " + err.stack);
        }
    });
});
