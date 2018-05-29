import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PointField,
} from "../../../src";

describe("RavenDB_9676", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });
    class Item {
        public name: string;
        public latitude: number;
        public longitude: number;
    }

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can order by distance on dynamic spatial field", async () => {
        {
            const session = store.openSession();
            const item = new Item();
            item.name = "Item1";
            item.latitude = 10;
            item.longitude = 10;

            await session.store(item);

            const item1 = new Item();
            item1.name = "Item2";
            item1.latitude = 11;
            item1.longitude = 11;

            await session.store(item1);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let items = await session.query<Item>(Item)
                .waitForNonStaleResults()
                .spatial(new PointField("latitude", "longitude"), f => f.withinRadius(1000, 10, 10))
                .orderByDistance(new PointField("latitude", "longitude"), 10, 10)
                .all();

            assert.equal(items.length, 2);
            assert.equal(items[0].name, "Item1");
            assert.equal(items[1].name, "Item2");

            items = await session.query<Item>(Item)
                .waitForNonStaleResults()
                .spatial(new PointField("latitude", "longitude"), f => f.withinRadius(1000, 10, 10))
                .orderByDistanceDescending(new PointField("latitude", "longitude"), 10, 10)
                .all();

            assert.equal(items.length, 2);
            assert.equal(items[0].name, "Item2");
            assert.equal(items[1].name, "Item1");
        }
    });
});
