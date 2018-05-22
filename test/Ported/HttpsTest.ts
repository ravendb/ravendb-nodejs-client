import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../src";

describe("HttpsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getSecuredDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can connect with certificate", async () => {
        const session = store.openSession();
        session.store({ lastName: "Snow" }, "users/1");
        session.saveChanges();
    });
});
