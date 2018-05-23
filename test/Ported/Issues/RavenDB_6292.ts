
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
import * as os from "os";

const isWindows = os.platform() === "win32";

(isWindows ? describe : describe.skip)("RavenDB-6292 - does not work on linux", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    // tslint:disable-next-line:no-empty
    it.skip("TODO if included document is conflicted, it should not throw conflict exception", async () => {

    });
});
