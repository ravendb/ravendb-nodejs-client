import * as mocha from "mocha";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import { DocumentStore, IDocumentStore, GetDatabaseNamesOperation } from "../../src";

describe("RDBC-202", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it.skip("can send server operations if db used in DocumentStore ctor does not exist", async function() {
        let store2;
        try {
            store2 = new DocumentStore(store.urls, "no_such_db");
            store2.initialize();
            await store2.maintenance.server.send(new GetDatabaseNamesOperation(0, 20));
            // Unhandled rejection DatabaseDoesNotExistException: no_such_db
            // at getError (C:\work\ravendb-nodejs-client\src\Exceptions\index.ts:37:17)
            // at Object.throwError (C:\work\ravendb-nodejs-client\src\Exceptions\index.ts:19:9)
            // at BluebirdPromise.resolve.then.then.unsuccessfulResponseHandled (C:\work\ravendb-nodejs-client\src\Http\RequestExecutor.ts:815:41)
            // at tryCatcher (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\util.js:16:23)
            // at Promise._settlePromiseFromHandler (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\promise.js:512:31)
            // at Promise._settlePromise (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\promise.js:569:18)
            // at Promise._settlePromise0 (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\promise.js:614:10)
            // at Promise._settlePromises (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\promise.js:693:18)
            // at Async._drainQueue (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\async.js:133:16)
            // at Async._drainQueues (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\async.js:143:10)
            // at Immediate.Async.drainQueues [as _onImmediate] (C:\work\ravendb-nodejs-client\node_modules\bluebird\js\release\async.js:17:14)
            // at runCallback (timers.js:763:18)
            // at tryOnImmediate (timers.js:734:5)
            // at processImmediate (timers.js:716:5)
        } catch (err) {
            assert.fail(`It should not throw, yet we got : ${err}`);
        } finally {
            if (store2) {
                store2.dispose();
            }
        }
    });
});
