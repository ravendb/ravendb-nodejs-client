import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PatchRequest,
    PatchOperation,
    GetCountersOperation,
} from "../../../src";
import { User } from "../../Assets/Entities";

describe("PatchOnCountersTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("canIncrementSingleCounter", async () => {
        const session = store.openSession();
        const user = Object.assign(new User(), { name: "Aviv" });
        await session.store(user, "users/1-A");
        session.countersFor("users/1-A")
            .increment("Downloads", 100);
        await session.saveChanges();

        const patch = new PatchRequest();
        patch.script = "incrementCounter(this, args.name, args.val)";
        patch.values = {
            name: "Downloads",
            val: 100
        };

        await store.operations.send(new PatchOperation("users/1-A", null, patch));
        const getCounters = await store.operations.send(new GetCountersOperation("users/1-A", ["Downloads"]));
        assert.strictEqual(getCounters.counters[0].totalValue, 200);
    });
});
