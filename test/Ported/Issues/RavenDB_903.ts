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
} from "../../../src";

describe("Issue RavenDB-903", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    xit("can ", async () => {
        throw new Error("Query not impl.");
    });
});
