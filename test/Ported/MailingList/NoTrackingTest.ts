import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    SessionBeforeQueryEventArgs,
} from "../../../src";

describe("NoTrackingTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async store => {
            store.conventions.findCollectionNameForObjectLiteral = e => e["id"].split("/")[0];
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canLoadEntitiesWithNoTracking", async () => {

        await createData(store);
        {
            const session = store.openSession();
            session.advanced.on("beforeQuery", (handler: SessionBeforeQueryEventArgs) => {
                handler.queryCustomization.noTracking();
            });

            const result = await session.query<any>({ collection: "a" })
                .include("bs")
                .all();
            assert.strictEqual(result.length, 1);
            result[0].bs.length = 0;
            assert.ok(!session.advanced.hasChanged(result[0]));
        }
    });

    async function createData(store: IDocumentStore): Promise<void> {
        const session = store.openSession();
        await session.store({
            id: "a/1",
            bs: ["b/1"]
        });
        await session.store({ id: "b/1" });
        await session.saveChanges();
    }

});
