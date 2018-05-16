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

describe("Session API usability tests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    describe("store()", () => {
        it.skip("can use callbacks", async () => { });
        it.skip("can use async/promises", async () => { });
    });

    describe("load()", () => {
        it.skip("can use callbacks", async () => { });
        it.skip("can use async/promises", async () => { });
    });

    describe("delete()", () => {
        it.skip("TODO", async () => {});
    });

    describe("rest of stuff", () => {
        it.skip("TODO", async () => {});
    });
});
